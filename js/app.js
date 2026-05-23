// 🔑 CONFIGURACIÓN DE LA API DE OPENWEATHERMAP
// Reemplaza "TU_API_KEY_AQUÍ" con tu clave real para las pruebas locales
const API_KEY = "TU_API_KEY_AQUÍ";
const URL_BASE_WEATHER = "https://api.openweathermap.org/data/2.5/weather";
const URL_BASE_FORECAST = "https://api.openweathermap.org/data/2.5/forecast";

// Variable global para controlar la instancia de la gráfica y evitar duplicados
let miGrafica = null;

// Elementos del DOM
const inputCiudad = document.getElementById("inputCiudad");
const btnBuscar = document.getElementById("btnBuscar");
const nombreCiudad = document.getElementById("nombreCiudad");
const txtTemperatura = document.getElementById("txtTemperatura");
const txtDescripcion = document.getElementById("txtDescripcion");
const txtHumedad = document.getElementById("txtHumedad");
const txtViento = document.getElementById("txtViento");
const txtPresion = document.getElementById("txtPresion");
const iconoClima = document.getElementById("iconoClima");

// 📍 FUNCIÓN 1: Geolocalización Nativa del Navegador
function obtenerUbicacionActual() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (posicion) => {
                const lat = posicion.coords.latitude;
                const lon = posicion.coords.longitude;
                // Si el usuario acepta, buscamos por coordenadas
                cargarDatosPorCoordenadas(lat, lon);
            },
            (error) => {
                console.warn("Ubicación rechazada o no disponible. Cargando ciudad por defecto.");
                // Si rechaza, cargamos una ciudad importante por defecto
                cargarDatosPorCiudad("Lima");
            }
        );
    } else {
        cargarDatosPorCiudad("Lima");
    }
}

// 🌐 FUNCIÓN 2: Petición por Coordenadas (Carga inicial)
async function cargarDatosPorCoordenadas(lat, lon) {
    const urlWeather = `${URL_BASE_WEATHER}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`;
    const urlForecast = `${URL_BASE_FORECAST}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`;
    
    ejecutarConsultasAsincronas(urlWeather, urlForecast);
}

// 🏙️ FUNCIÓN 3: Petición por Nombre de Ciudad (Barra de búsqueda)
async function cargarDatosPorCiudad(ciudad) {
    if (!ciudad.trim()) return;
    const urlWeather = `${URL_BASE_WEATHER}?q=${encodeURIComponent(ciudad)}&appid=${API_KEY}&units=metric&lang=es`;
    const urlForecast = `${URL_BASE_FORECAST}?q=${encodeURIComponent(ciudad)}&appid=${API_KEY}&units=metric&lang=es`;
    
    ejecutarConsultasAsincronas(urlWeather, urlForecast);
}

// ⚡ FUNCIÓN 4: Orquestador Asíncrono (Promesas en paralelo)
async function ejecutarConsultasAsincronas(urlWeather, urlForecast) {
    try {
        // Ejecutamos ambas peticiones al mismo tiempo para optimizar velocidad
        const [respuestaWeather, respuestaForecast] = await Promise.all([
            fetch(urlWeather),
            fetch(urlForecast)
        ]);

        if (!respuestaWeather.ok || !respuestaForecast.ok) {
            throw new Error("Ciudad no encontrada o error en el servidor");
        }

        const datosWeather = await respuestaWeather.json();
        const datosForecast = await respuestaForecast.json();

        // Renderizar la información en la pantalla
        mostrarClimaActual(datosWeather);
        renderizarGraficaAnalitica(datosForecast);

    } catch (error) {
        console.error(error);
        alert("⚠️ No se pudieron obtener los datos climáticos. Verifica el nombre de la ciudad o tu API Key.");
    }
}

// 🎨 FUNCIÓN 5: Inyectar datos actuales en el DOM
function mostrarClimaActual(datos) {
    nombreCiudad.innerText = `${datos.name}, ${datos.sys.country}`;
    txtTemperatura.innerText = Math.round(datos.main.temp);
    txtDescripcion.innerText = datos.weather[0].description.toUpperCase();
    txtHumedad.innerText = `${datos.main.humidity}%`;
    txtViento.innerText = `${Math.round(datos.wind.speed * 3.6)} km/h`; // Conversión de m/s a km/h
    txtPresion.innerText = `${datos.main.pressure} hPa`;
    
    // Configurar icono oficial de OpenWeather
    const codigoIcono = datos.weather[0].icon;
    iconoClima.src = `https://openweathermap.org/img/wn/${codigoIcono}@2x.png`;
    iconoClima.classList.remove("hidden");
}

// 📊 FUNCIÓN 6: Inicializar o actualizar Chart.js de forma reactiva
function renderizarGraficaAnalitica(datos) {
    // Tomamos solo las primeras 8 lecturas del pronóstico (las próximas 24 horas)
    const proximasLecturas = datos.list.slice(0, 8);

    // Mapeamos los arreglos con las horas y las temperaturas correspondientes
    const etiquetasHoras = proximasLecturas.map(lectura => {
        const fecha = new Date(lectura.dt * 1000);
        return fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    
    const datosTemperaturas = proximasLecturas.map(lectura => Math.round(lectura.main.temp));

    // Si ya existía una gráfica previa en pantalla, la destruimos para evitar errores visuales al renderizar la nueva
    if (miGrafica) {
        miGrafica.destroy();
    }

   const ctx = document.getElementById('graficaTemperatura').getContext('2d');
    
    // Instancia y configuración avanzada del gráfico lineal
    miGrafica = new Chart(ctx, {
        type: 'line',
        data: {
            labels: etiquetasHoras,
            datasets: [{
                label: 'Temperatura (°C)',
                data: datosTemperaturas,
                borderColor: '#00d2ff',
                backgroundColor: 'rgba(0, 210, 255, 0.1)',
                borderWidth: 3,
                tension: 0.4, // Curvatura elegante en los puntos de la línea
                fill: true,
                pointBackgroundColor: '#00d2ff',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false } // Ocultamos la leyenda para un look más limpio
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#8b949e' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#8b949e' }
                }
            }
        }
    });
}

// 🛠️ ESCUCHADORES DE EVENTOS
btnBuscar.addEventListener("click", () => cargarDatosPorCiudad(inputCiudad.value));
inputCiudad.addEventListener("keypress", (e) => {
    if (e.key === "Enter") cargarDatosPorCiudad(inputCiudad.value);
});

// Lanzamiento automático de geolocalización al abrir la app
obtenerUbicacionActual();