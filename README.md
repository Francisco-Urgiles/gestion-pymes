# Gestión PYMES

Interfaz web estática para gestionar clientes, operaciones, pagos y agenda.

La autenticación, los permisos, los planes y los datos se gestionan en el backend de Google Apps Script. Los planes admiten 3, 10 y 20 usuarios activos.

## Publicación

GitHub Pages publica la rama `main`, carpeta raíz. El archivo `.nojekyll` permite servir estos recursos estáticos directamente.

## Configuración

`js/config.js` contiene la identidad visual y las URLs públicas de la instalación. Las claves privadas se configuran exclusivamente en las propiedades del proyecto Apps Script.

Esta carpeta contiene únicamente el frontend. El backend y las instrucciones de migración se conservan en el workspace de desarrollo.

