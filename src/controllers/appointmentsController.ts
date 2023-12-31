import { Request, Response } from "express";
import { Appointment } from "../models/Appointment";
import { Users } from "../models/User";
import { Portfolio } from "../models/Portfolio";
import { Worker } from "../models/Worker";
import dayjs from "dayjs";

// Usuario y admin: Crear una cita
// Me gustaría modificar la forma de devolver la información cuando se crea la cita.
const createAppointment = async (req: Request, res: Response) => {
  try {
    if ((req.token.role == "user", "admin" && req.token.is_active == true)) {
      //Recuperar el id del usuario por su token
      const user = await Users.findOne({
        where: { id: req.token.id },
      });

      if (!user) {
        return res.json("El usuario no existe.");
      }

      const { portfolio_id, date } = req.body;

      const existPortfolio = await Portfolio.findOne({
        where: { id: portfolio_id },
      });

      const worker_id = existPortfolio?.worker_id;

      const worker = await Worker.findOne({
        where: { id: worker_id },
      });

      if (!worker) {
        return res.json("El trabajador no existe.");
      }

      if (!existPortfolio) {
        return res.json("El portfolio no existe.");
      }

      const dateBody = dayjs(date, "'{AAAA} MM-DDTHH:mm:ss SSS [Z] A'");
      const dateNow = dayjs();

      if (!dateBody.isValid() || dateBody < dateNow) {
        return res.json(
          "El formato de la fecha no es válida o es anterior a la creación de la cita. Es {AAAA} MM-DDTHH:mm:ss SSS [Z] A' "
        );
      }

      if (!dateBody) {
        return res.json("La fecha y hora no puede ser nula.");
      }

      if (user.id == worker.user_id) {
        return res.json(
          "Política de empresa: Un trabajador no puede hacerse un tatuaje él mismo."
        );
      }

      const existAppointment = await Appointment.findOne({
        where: { artist: worker_id, date: dateBody.toDate() },
      });

      if (existAppointment) {
        return res.json("Cita no disponible: Introduce otra fecha y hora.");
      }

      const newAppointment = await Appointment.create({
        client: user.id,
        portfolio_id,
        artist: worker_id,
        date: dateBody.toDate(),
      }).save();
      return res.json(newAppointment);
    }
    return res.json("Usuario no autorizado.");
  } catch (error) {
    console.log(error);
    return res.json({
      succes: false,
      message: "No se ha creado la cita",
      // esto lo utilizamos para que nos salte el tipo de error
      error: error,
    });
  }
};

// SuperAdmin: Recuperar la información de TODAS las citas.
//-- Me gustaría optimizar: cuando nos devuelve los resultados, que nos devuelva información del usuario y los datos organizados.
const getAllAppointments = async (req: Request, res: Response) => {
  try {
    const appointments = await Appointment.find({
      relations: ["portfolio", "userAppointment"],
    });
    if (appointments.length == 0) {
      return res.json("Actualmente no existen portfolios.");
    }
    return res.json(appointments);
  } catch (error) {
    console.log(error);
    return res.json({
      succes: false,
      message: "No se ha podido realizar la consulta",
      error: error,
    });
  }
};

//Recuperar todas las citas del cliente.
//-- Me gustaría optimizar: cuando nos devuelve los resultados
const getAppointmentsByUserId = async (req: Request, res: Response) => {
  try {
    if ((req.token.role == "user", "admin" && req.token.is_active == true)) {
      //Recuperar el id del usuario por su token
      const user = await Users.findOne({
        where: { id: req.token.id },
      });

      if (!user) {
        return res.json("El usuario no existe.");
      }

      const appointments = await Appointment.find({
        where: { client: user.id, is_active:true },
        relations: ["portfolio", "userAppointment", "workerAppointment"],
      });

      if (appointments.length === 0) {
        return res.json("Actualmente no existen citas para este usuario.");
      }

      return res.json(appointments);
    } else {
      return res.json("Usuario no autorizado.");
    }
  } catch (error) {
    console.log(error);
    return res.json({
      succes: false,
      message: "No se ha podido realizar la consulta",
      error: error,
    });
  }
};

//Recuperar todas las citas del trabajador.
//-- Me gustaría optimizar: cuando nos devuelve los resultados
const getAppointmentsByWorkerId = async (req: Request, res: Response) => {
  try {
    if (req.token.role == "admin" && req.token.is_active == true) {
      //Recuperar el id del usuario por su token
      const user = await Users.findOne({
        where: { id: req.token.id },
      });

      if (!user) {
        return res.json("El usuario no existe.");
      }

      const worker = await Worker.findOne({
        where: { user_id: user.id },
      });

      if (!worker) {
        return res.json("Este usuario no es un trabajador.");
      }

      const appointments = await Appointment.find({
        where: { artist: worker.id , is_active: true},
        relations: ["portfolio", "userAppointment", "workerAppointment"],
      });

      if (appointments.length === 0) {
        return res.json("Actualmente no existen citas para este usuario.");
      }

      return res.json(appointments);
    } else {
      return res.json("Usuario no autorizado.");
    }
  } catch (error) {
    console.log(error);
    return res.json({
      succes: false,
      message: "No se ha podido realizar la consulta",
      error: error,
    });
  }
};

// Worker: Puedan acceder a sus citas y filtrarlas por el estado.
const getAppointmentsStatusByWorkerId = async (req: Request, res: Response) => {
  try {
    if (req.token.role == "admin" && req.token.is_active == true) {
      //Recuperar el id del usuario por su token
      const user = await Users.findOne({
        where: { id: req.token.id },
      });

      if (!user) {
        return res.json("El usuario no existe.");
      }

      const worker = await Worker.findOne({
        where: { user_id: user.id },
      });

      if (!worker) {
        return res.json("Este usuario no es un trabajador.");
      }

      const { status } = req.params;

      const appointments = await Appointment.find({
        where: { artist: worker.id, status_appointment: status, is_active:true },
        relations: ["portfolio", "userAppointment", "workerAppointment"],
      });

      if (appointments.length === 0) {
        return res.json("Actualmente no existen citas para este usuario.");
      }
      return res.json(appointments);
    } else {
      return res.json("Usuario no autorizado.");
    }
  } catch (error) {
    console.log(error);
    return res.json({
      succes: false,
      message: "No se ha podido realizar la consulta",
      error: error,
    });
  }
};

//Usuario: Actualizar cita: el portfolio o la fecha y a consecuencia, vuelva de nuevo el estado de solicitud.
const updateAppointmentUser = async (req: Request, res: Response) => {
  try {
    if (((req.token.role === "user" || req.token.role === "admin") && req.token.is_active == true)) {
      //Recuperar el id del usuario por su token
      const user = await Users.findOne({
        where: { id: req.token.id },
      });

      if (!user) {
        return res.json("El usuario no existe.");
      }    

      const { appointmentId, portfolio_id, date, is_active } = req.body;

      const userAppointment = await Appointment.findOne({
        where: {id: appointmentId}
      });

      if (user.id !== userAppointment?.client) {
        return res.json("No puedes modificar una cita de otro cliente.");
      }
      
      if (!userAppointment){
        return res.json ("La cita no existe.")
      }
      const existPortfolio = await Portfolio.findOne({
        where: { id: portfolio_id },
        
      });

      const worker_id = existPortfolio?.worker_id;

      const worker = await Worker.findOne({
        where: { id: worker_id },
      });

      if (!worker) {
        return res.json("El trabajador no existe.");
      }

      if (!existPortfolio) {
        return res.json("El portfolio no existe.");
      }
     
      const dateBody = dayjs(date, "'{AAAA} MM-DDTHH:mm:ss SSS [Z] A'");
      const dateNow = dayjs();

      if (!dateBody.isValid() || dateBody < dateNow) {
        return res.json(
          "El formato de la fecha no es válida o es anterior a la creación de la cita. Es {AAAA} MM-DDTHH:mm:ss SSS [Z] A' "
        );
      }

      if (!dateBody) {
        return res.json("La fecha y hora no puede ser nula.");
      }

      if (user.id == worker.user_id) {
        return res.json(
          "Política de empresa: Un trabajador no puede hacerse un tatuaje él mismo."
        );
      }

      const existAppointment = await Appointment.findOne({
        where: { artist: worker_id, date },
      });

      if (existAppointment) {
        return res.json("Cita no disponible: Introduce otra fecha y hora.");
      }

      const status_appointment = "pending";

      await Appointment.update(
        {
          id: parseInt(appointmentId),
        },
        {
          client: user.id,
          portfolio_id,
          artist: worker_id,
          date: dateBody.toDate(),
          status_appointment,
          is_active,
        }
      );

      return res.json("La cita ha sido actualizada con éxito");
    } else {
      return res.json("Usuario no autorizado.");
    }
  } catch (error) {
    console.log(error);
    return res.json({
      succes: false,
      message: "No se ha actualizado la cita",
      // esto lo utilizamos para que nos salte el tipo de error
      error: error,
    });
  }
};

//Worker: Actualizar el estado de una cita.
const updateAppointmentWorker = async (req: Request, res: Response) => {
  try {
    if (req.token.role == "admin" && req.token.is_active == true) {
      //Recuperar el id del usuario por su token
      const user = await Users.findOne({
        where: { id: req.token.id },
      });

      if (!user) {
        return res.json("El usuario no existe.");
      }

      const worker = await Worker.findOne({
        where: { user_id: user.id },
      });

      if (!worker) {
        return res.json("Este usuario no es un trabajador.");
      }

      const { id, status_appointment } = req.body;

      const appointment = await Appointment.findOne({
        where: { id: id, artist: worker.id },
      });

      if (!appointment) {
        return res.json("No puedes actualizar una cita de otro trabajador.");
      }

      await Appointment.update(
        {
          id: parseInt(id),
        },
        {
          status_appointment,
        }
      );

      return res.json("La cita se ha actualizado con éxito.");
    } else {
      return res.json("Usuario no autorizado.");
    }
  } catch (error) {
    console.log(error);
    return res.json({
      succes: false,
      message: "No se ha actualizado la cita",
      error: error,
    });
  }
};

//Super_Admin: Eliminar citas.
const deleteAppointment = async (req: Request, res: Response) => {
  try {
    const appointmentIdToDelete = req.body.id;
    const appointmentToRemove = await Appointment.findOneBy({
      id: parseInt(appointmentIdToDelete),
    });

    if (!appointmentToRemove) {
      return res.json("La cita que quieres eliminar no existe.");
    }
    const appointmentRemoved = await Appointment.remove(
      appointmentToRemove as Appointment
    );
    if (appointmentRemoved) {
      return res.json("Se ha eliminado la cita correctamente");
    }
  } catch (error) {
    console.log(error);
    return res.json({
      succes: false,
      message: "No se ha eliminado la cita",
      // esto lo utilizamos para que nos salte el tipo de error
      error: error,
    });
  }
};

export {
  createAppointment,
  getAllAppointments,
  updateAppointmentUser,
  deleteAppointment,
  getAppointmentsByUserId,
  getAppointmentsByWorkerId,
  updateAppointmentWorker,
  getAppointmentsStatusByWorkerId,
};
