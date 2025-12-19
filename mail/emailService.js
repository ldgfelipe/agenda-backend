const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    // Esto ayuda a que la conexión no sea rechazada por el VPS
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  }
});

const enviarConfirmacionCita = async (datosCita) => {
  const { pacienteEmail, pacienteNombre, fecha, hora, consultorio } = datosCita;

  const mailOptions = {
    from: `"Agenda Mediwork" <${process.env.EMAIL_USER}>`,
    to: pacienteEmail,
    subject: 'Confirmación de tu Cita Médica 🩺',
    html: `
      <div style="font-family: sans-serif; color: #333;">
        <h2>¡Hola, ${pacienteNombre}!</h2>
        <p>Tu cita ha sido agendada con éxito.</p>
        <hr />
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Hora:</strong> ${hora}</p>
        <p><strong>Consultorio:</strong> ${consultorio}</p>
        <hr />
        <p>Si necesitas cancelar o reprogramar, por favor contáctanos con anticipación.</p>
        <p>Saludos,<br>Equipo Mediwork</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Correo enviado correctamente');
  } catch (error) {
    console.error('Error enviando correo:', error);
  }
};

module.exports = { enviarConfirmacionCita };