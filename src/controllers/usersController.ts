import { Request, Response } from "express";
import { Users } from "../models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { validate } from "class-validator";
import dayjs from "dayjs";

// Crear nuevos usuarios
const createUser = async (req: Request, res: Response) => {
  try {
    // Recuperamos la información que nos envían desde el body
    const { name, surname, phone, email, password } = req.body;

    //Creamos un objeto para la validación 
    const Uservalidate = new Users();
    Uservalidate.name = name.trim();
    Uservalidate.surname = surname.trim();
    Uservalidate.phone = phone;
    Uservalidate.email = email;
    Uservalidate.password = password.trim();
    Uservalidate.is_active = true;
    Uservalidate.role = "user";
    Uservalidate.update_at = new Date(
      dayjs(new Date()).format("YYYY-MM-DD HH:mm:ss")
    );
    Uservalidate.created_at = new Date(
      dayjs(new Date()).format("YYYY-MM-DD HH:mm:ss")
    );

    //Evaluamos la validacion mediante class-validator validate
    const errorValidate = await validate(Uservalidate);
    if (errorValidate.length > 0) {
      return res.status(404).json(errorValidate);
    }

    //Debemos encriptar la contraseña antes de guardarla.
    const encryptedPassword = bcrypt.hashSync(password.trim(), 10);
    const newUser = await Users.create({
      name: name.trim(),
      surname: surname.trim(),
      phone,
      email: email.trim(),
      password: encryptedPassword,
    }).save();
    if (newUser){
      const token = jwt.sign(
        {
          id: newUser.id,
          role: newUser.role,
          is_active: newUser.is_active,
        },
        process.env.JWT_SECRET as string,
        {
          expiresIn: "2h",
        }
      );
      return res.json({
        success: true,
        message: `Bienvenid@ a tu perfil, ${newUser.name}`,
        token: token,
        name: newUser.name,
      });
    }
  
  } catch (error) {
    res.status(403).json("No se ha creado el usuario.");
  }
};

//Recuperar todos los usuarios
const getAllUsers = async (req: Request, res: Response) => {
  try {
    // lógica de la infor que recuperamos la información de TODOS los usuarios
    const users = await Users.find();
    if (users.length == 0) {
      return res.json("No hay usuarios registrados.");
    } else {
      return res.json(users);
    }
  } catch (error) {
    return res.json({
      succes: false,
      message: "No hemos podido recuperar los usuarios",
      // esto lo utilizamos para que nos salte el tipo de error
      error: error,
    });
  }
};

//Login
const loginUser = async (req: Request, res: Response) => {
  try {
    // Recuperamos los datos guardados en body
    const { email, password } = req.body;

    // Comprobamos que nos envían characteres.
    if (
      !req.body.email ||
      !req.body.password ||
      req.body.email.trim() === "" ||
      req.body.password.trim() === ""
    ) {
      return res.json({
        success: true,
        message: "Introduce usuario y contraseña.",
      });
    }

    // Validación de que el email sea @
    const emailRegex = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
    if (!emailRegex.test(email) || email.length == 0 || email.length > 50 ){
      return res.json("Formato de email incorrecto. Recuerda: Número máx. de caracteres 50.")
    }

    // Validación que el password contiene como mínimo y como máximo.
    if(password.length < 6 || password.length >12) {
      return res.json ("El password debe contener de 6 a 12 caracteres.")
    }
    //Consultar en BD si el usuario existe
    const user = await Users.findOneBy({
      email: email.trim(),
    });

    // En el caso que el usuario no sea el mismo
    if (!user) {
      return res.status(403).json("Usuario o contraseña incorrecta");
    }
    //Comprobamos si el usuario está activo
    if (!user?.is_active) {
      return res.status(404).json("Usuario no activo.");
    }
    //Si el usuario si es correcto, compruebo la contraseña
    console.log(user.password);
    if (bcrypt.compareSync(password.trim(), user.password)) {
      //En caso de que hayamos verificado que el usuario es correcto y se corresponde a la contraseña que hemos indicado, generar token
      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
          is_active: user.is_active,
        },
        process.env.JWT_SECRET as string,
        {
          expiresIn: "2h",
        }
      );
      return res.json({
        success: true,
        message: `Bienvenid@ a tu perfil, ${user.name}`,
        token: token,
        name: user.name,
      });
    } else {
      return res
        .status(403)
        .json({ message: "Usuario o contraseña incorrecta." });
    }
  } catch (error) {
    return res.status(500).json(error);
  }
};

// Profile
const profileUser = async (req: any, res: Response) => {
  try {
    //para saber que usuario está accediendo
    const user = await Users.findOneBy({
      id: req.token.id,
    });
    // Añadimos que, si el usuario en el momento desactive la cuenta, ya no se le permite acceder a su perfil.
    if (!user) {
      return res.status(403).json("Usuario o contraseña incorrecta.");
    }

    if (!user?.is_active) {
      return res.status(404).json("Usuario no activo.");
    }

    return res.json({
      message: "Datos del perfil",
      data: user,
    });
  } catch (error) {
    return res.json({
      succes: false,
      message: "No se puede procesar la respuesta",
      // esto lo utilizamos para que nos salte el tipo de error
      error: error,
    });
  }
};

// Superadmin y usuario puede actualizar la información de usuario, dependiendo de la ruta.
const updateUser = async (req: Request, res: Response) => {
  try {
    let user;
    if (
      req.token.role == "super_admin" &&
      req.token.is_active == true &&
      req.params.id
    ) {
      console.log(req.params.id);
      user = await Users.findOne({
        where: { id: parseInt(req.params.id) },
      });
    } else if (
      req.token.role !== "super_admin" &&
      req.token.is_active == true
    ) {
      //Lógica para actualizar usuarios por su Id
      user = await Users.findOne({
        where: { id: req.token.id },
      });
    } else {
      return res.status(403).json({ message: "Usuario no autorizado" });
    }

    // Indicamos los datos que se pueden actualizar a través de esta ruta.
    const { name, surname, phone, email, is_active } = req.body;
    
    // Validar el formato de los nuevos datos.
    const emailRegex = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
    if (email !== undefined && email.trim() !=="" && !emailRegex.test(email) && (email.length == 0 || email.length > 50) ){
      return res.json("Formato de email incorrecto. Recuerda: Número máx. de caracteres 50.")
    }
    if(name !== undefined && name.trim() !=="" && name.length >50) {
      return res.json ("User: Número máx. de caracteres 50.")
    }
    if(surname !== undefined && surname.trim() !=="" && surname.length >50) {
      return res.json ("User: Número máx. de caracteres 50.")
    }
    if(phone !== undefined && (phone >999999999 || phone < 600000000 )){
      return res.json ("Introduce un número de 9 caracteres, puede empezar desde el 6.")
    }
   
    //Comprobamos que el usuario exista
    if (!user) {
      return res.status(403).json({ message: "Usuario no encontrado" });
    }
    // Declaramos el id, de esta forma, podemos indicar en el caso que sea super admin, el id del usuario que queremos modificar lo recuperaremos de la búsqueda o bien,
    //en el caso que sea el propio usuario que quiera modificar sus datos, el id lo recuperamos del token.
    let id;
    
    if (req.token.role === "super_admin" && req.params.id) {
      id = parseInt(req.params.id);
    } else {
      id = req.token.id;
    }
    await Users.update(
      {
        id: id,
      },
      {
        name,
        surname,
        phone,
        email,
        is_active,
      }
    );

    return res.json(`El usuario,ha sido actualizado con éxito.`);
  } catch (error) {
    console.log("error", error);
    return res.json({
      succes: false,
      message: "El usuario no ha sido actualizado.",
      error: error,
    });
  }
};

// Usuario puede actualizar el password.
const updatePassword = async (req: Request, res: Response) => {
  try {
    //Lógica actualizar el password
    let user;

    if (req.token.is_active == true) {
      //Lógica para actualizar usuarios por su Id
      user = await Users.findOne({
        where: { id: req.token.id },
      });
    } else {
      return res.status(403).json({ message: "Usuario no autorizado" });
    }

    // Campos que nos pueden enviar a través del body para ser modificados.
    const { password, passwordOld } = req.body;
    if (password.trim() == "" || passwordOld.trim () == "") {
      return res.json("Debes añadir un campo.");
    }
   
    // Validación que el password contiene como mínimo y como máximo.
    if(passwordOld.length < 6 || passwordOld.length >12) {
      return res.json ("El passwordOld debe contener de 6 a 12 caracteres.")
    }
    //Comprobamos que el usuario exista
    if (!user) {
      return res.status(403).json({ message: "Usuario no encontrado" });
    }

    if (passwordOld !== password) {
      if (bcrypt.compareSync(passwordOld, user.password)) {
        console.log("aqui entra");
        const encryptedPassword = bcrypt.hashSync(password.trim(), 10);
        await Users.update(
          {
            id: req.token.id,
          },
          {
            password: encryptedPassword,
          }
        );
        return res.status(202).json("Contraseña modificada");
      } else {
        return res.status(401).json({
          message: "La contraseña no coincide, vuelva a intentarlo.",
        });
      }
    } else {
      return res
        .status(404)
        .json({ message: "Recuerda: La contraseña debe ser diferente." });
    }
  } catch (error) {
    console.log(error);
    return res.json({
      succes: false,
      message: "No se ha actualizado el usuario",
      // esto lo utilizamos para que nos salte el tipo de error
      error: error,
    });
  }
};

//Lógica para eliminar usuario por el Id
const deleteUserById = async (req: Request, res: Response) => {
  try {
    // Recuperamos el valor del id a eliminar por el body.
    const userIdToDelete = req.body.id;
    const userToRemove = await Users.findOneBy({
      id: parseInt(userIdToDelete),
    });

    if (!userToRemove){
      return res.json ("El usuario que se quiere eliminar no existe.")
    }
    if (userToRemove?.role !== "super_admin") {
      const userRemoved = await Users.remove(userToRemove as Users);
      if (userRemoved) {
        return res.json("Se ha eliminado el usuario correctamente");
      }
    } else {
      return res.json(
        "No se puede eliminar el usuario, porque es super_admin."
      );
    }
  } catch (error) {
    console.log(error);
    return res.json({
      succes: false,
      message: "No se ha eliminado el usuario",
      error: error,
    });
  }
};

export {
  getAllUsers,
  loginUser,
  profileUser,
  createUser,
  updateUser,
  updatePassword,
  deleteUserById,
};
