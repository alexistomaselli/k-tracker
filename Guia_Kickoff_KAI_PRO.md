# Guía de Kickoff y Pruebas - K-Tracker

Este documento está diseñado para guiar al equipo de **KAI PRO** a través del flujo completo de la plataforma, desde la configuración inicial hasta la operación diaria de las empresas y sus colaboradores.

Siga estos pasos para validar el funcionamiento integral del sistema.

---

## 1. Acceso y Configuración Inicial (KAI PRO Admin)

El primer paso es preparar la plataforma para recibir a las empresas clientes.

### Acceso al Panel de Administración
*   **URL:** [https://kai-pro-k-tracker.3znlkb.easypanel.host/admin/login](https://kai-pro-k-tracker.3znlkb.easypanel.host/admin/login)
*   **Usuario:** `admin@kaipro.com`
*   **Contraseña:** `Ktracker-123`

### Configuración de Cuentas Bancarias
Una vez dentro del panel, es fundamental configurar las cuentas donde las empresas realizarán los pagos de suscripción.
1.  Navegue a la sección **Cuentas Bancarias** (`/admin/bank-accounts`).
2.  Añada los datos de la cuenta bancaria de KAI PRO.
3.  *Esta información será visible para las empresas al momento de registrarse y pagar.*

---

## 2. Registro de Nueva Empresa (Flujo de Cliente)

Simulemos el proceso de una empresa que desea contratar K-Tracker.

1.  Vaya a la página principal (Landing Page) y seleccione **Registrarse**.
2.  Complete el formulario con los datos de la empresa.
3.  Seleccione un **Plan de Suscripción**.
4.  El sistema mostrará las cuentas bancarias configuradas en el paso anterior.
5.  La empresa realiza la transferencia y **sube el comprobante de pago**.
6.  Al finalizar, la empresa quedará en estado "Pendiente de Aprobación".

---

## 3. Validación y Aprobación (KAI PRO Admin)

El administrador de KAI PRO debe validar el registro y el pago.

1.  Regrese al **Dashboard de Admin KAI PRO**.
2.  Utilice las **Acciones Rápidas** o navegue a:
    *   **Gestionar Pagos:** Verifique el comprobante subido. Si es correcto, marque el pago como **Aprobado**.
    *   **Gestionar Empresas:** Verifique los datos de la empresa. Si todo está en orden, cambie el estado a **Aprobado**.
3.  *Una vez aprobada, la empresa recibirá acceso inmediato a su propio panel.*

---

## 4. Gestión de Empresa (Admin Empresa)

Ahora, ingrese con las credenciales de la empresa recién aprobada para configurar su entorno de trabajo.

### Gestión de Equipo (RRHH)
1.  Vaya a **Recursos Humanos** (`/hr`).
2.  Registre a los **Responsables/Participantes** (empleados) que usarán el sistema.
3.  Se les asignará un rol y credenciales de acceso.

### Configuración de Proyectos y Rutinas
1.  Vaya a **Proyectos** y cree un nuevo proyecto.
2.  Defina las **Áreas** (Rutinas) del proyecto (ej. Estructuras, Instalaciones, Acabados).

### Gestión de Actas y Tareas
1.  Vaya a **Actas** y genere una nueva acta de reunión.
2.  Dentro del acta, cree compromisos y **asigne Tareas** a los participantes registrados.
3.  Puede agregar comentarios y fechas límite.

### Conexión a WhatsApp
1.  Vaya a **Configuración > WhatsApp**.
2.  Escanee el código QR para vincular el número de la empresa.
3.  *Esto permitirá enviar notificaciones automáticas de tareas y actas a los participantes.*

### Pagos de Suscripción
1.  En la sección **Facturación**, la empresa puede reportar los pagos de renovación de su plan mensualmente, adjuntando los nuevos comprobantes.

---

## 5. Gestión Operativa (Responsable/Participante)

Finalmente, validemos la experiencia del usuario final (el empleado).

1.  Cierre sesión e ingrese con las credenciales de un **Participante** creado en el paso 4.
2.  **Visualización de Tareas:** En su Dashboard, verá las tareas que se le han asignado.
3.  **Gestión de Tareas:**
    *   Cambiar el estado (Pendiente -> En Progreso -> Completada).
    *   Agregar **Comentarios** o dudas sobre la tarea.
4.  **Perfil:** En **Mi Cuenta**, puede actualizar sus datos personales y contraseña.

---

## Soporte

Si durante este proceso de Kickoff encuentra alguna inconsistencia, por favor repórtelo al equipo de desarrollo.
