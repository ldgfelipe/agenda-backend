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
  const { pacienteEmail, pacienteNombre, fecha, hora, consultorio, medico } = datosCita;

  const mailOptions = {
    from: `"Agenda Mediwork" <${process.env.EMAIL_USER}>`,
    to: pacienteEmail,
    subject: 'Confirmación de tu Cita Médica 🩺',
    html: `
      <div style="font-family: sans-serif; color: #333;">
      <div>
        <img src="https://comunidadmediwork.com.mx/wp-content/uploads/2025/08/cropped-MEDIWORKENOSCURO-1024x262.png" width="250" /> 
      </div>
        <h2>¡Hola, ${pacienteNombre}!</h2>
        <p>Tu cita ha sido agendada con éxito.</p>
        <hr />
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Hora:</strong> ${hora}</p>
        <p>Medico: ${medico}</p>
        <p><strong>Consultorio:</strong> ${consultorio}</p>
        <hr />
            Estamos ubicados en: 
            <p>
            Nos ubicamos en Blvd. 5 de mayo 2307, Col. el Carmén. 
            A sólo 5 minutos de Plaza Dorada y el Centro de Puebla<br />
            <a href="https://maps.app.goo.gl/xf66jGSwr5uxu2ap7" target="_blank" >Ver Mapa</a>
            </p>
        <hr />
        <p>Si necesitas cancelar o reprogramar, por favor contáctanos con anticipación.</p>
        <p><a href="https://wa.me/5212202375233">2202375233</a></p>
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