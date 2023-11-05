import { Router } from "express";
import { createAppointment, deleteAppointment, getAllAppointments, getAppointmentsByUserId, getAppointmentsByWorkerId,  updateAppointmentUser, updateAppointmentWorker } from "../controllers/appointmentsController";
import { auth } from "../middelware/auth";
import { isSuperAdmin } from "../middelware/isSuperAdmin";

const router = Router ()

// User y Admin: Crear una cita.
router.post('/', auth, createAppointment)

// SuperAdmin: Recuperar la información de TODAS las citas.
router.get ('/', auth, isSuperAdmin, getAllAppointments)

//Usuario y Admin: Recuperar todas las citas del cliente.
router.get('/user', auth, getAppointmentsByUserId)

//Admin: Recuperar todas las citas del trabajador.
router.get('/worker', auth, getAppointmentsByWorkerId)

//Usuario: Actualizar cita: el portfolio o la fecha y a consecuencia, vuelva de nuevo el estado de solicitud.
router.put ('/user', auth, updateAppointmentUser)

//Trabajador: Actualizar cita: el portfolio o la fecha y a consecuencia, vuelva de nuevo el estado de solicitud.
router.put ('/worker', auth, updateAppointmentWorker)

//Super_Admin: Eliminar citas.
router.delete ('/',auth, isSuperAdmin, deleteAppointment)

export {router}