const API_KEY = "TU_API_KEY_AQUÍ";
const URL_BASE_WEATHER = "https://api.openweathermap.org/data/2.5/weather";
const URL_BASE_FORECAST = "https://api.openweathermap.org/data/2.5/forecast";

let miGrafica = null;
let cacheGeografico = null;

const inputCiudad = document.getElementById("inputCiudad");
const btnBuscar = document.getElementById("btnBuscar");
const nombreCiudad = document.getElementById("nombreCiudad");
const txtTemperatura = document.getElementById("txtTemperatura");
const txtDescripcion = document.getElementById("txtDescripcion");
const txtHumedad = document.getElementById("txtHumedad");
const txtViento = document.getElementById("txtViento");
const txtPresion = document.getElementById("txtPresion");
const iconoClima = document.getElementById("iconoClima");
const selectPais = document.getElementById("selectPais");
const selectEstado = document.getElementById("selectEstado");
const selectCiudad = document.getElementById("selectCiudad");
const selectDistrito = document.getElementById("selectDistrito");

function obtenerUbicacionActual() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (posicion) => {
                const lat = posicion.coords.latitude;
                const lon = posicion.coords.longitude;
                cargarDatosPorCoordenadas(lat, lon);
            },
            (error) => {
                console.warn("Ubicación rechazada o no disponible. Cargando ciudad por defecto.");
                cargarDatosPorCiudad("Lima");
            }
        );
    } else {
        cargarDatosPorCiudad("Lima");
    }
}

async function cargarDatosPorCoordenadas(lat, lon) {
    const urlWeather = `${URL_BASE_WEATHER}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`;
    const urlForecast = `${URL_BASE_FORECAST}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`;
    ejecutarConsultasAsincronas(urlWeather, urlForecast);
}

async function cargarDatosPorCiudad(ciudad, estado = "", pais = "", distrito = "") {
    if (!ciudad.trim()) return;
    let query = encodeURIComponent(ciudad.trim());
    if (distrito) {
        query = `${encodeURIComponent(distrito)},${query}`;
    } else {
        if (estado) query = `${query},${encodeURIComponent(estado)}`;
    }
    if (pais) query = `${query},${encodeURIComponent(pais)}`;
    const urlWeather = `${URL_BASE_WEATHER}?q=${query}&appid=${API_KEY}&units=metric&lang=es`;
    const urlForecast = `${URL_BASE_FORECAST}?q=${query}&appid=${API_KEY}&units=metric&lang=es`;
    ejecutarConsultasAsincronas(urlWeather, urlForecast);
}

async function ejecutarConsultasAsincronas(urlWeather, urlForecast) {
    try {
        const [respuestaWeather, respuestaForecast] = await Promise.all([
            fetch(urlWeather),
            fetch(urlForecast)
        ]);

        if (!respuestaWeather.ok || !respuestaForecast.ok) {
            throw new Error("Ciudad no encontrada o error en el servidor");
        }

        const datosWeather = await respuestaWeather.json();
        const datosForecast = await respuestaForecast.json();

        mostrarClimaActual(datosWeather);
        renderizarGraficaAnalitica(datosForecast);

    } catch (error) {
        console.error(error);
        alert("⚠️ No se pudieron obtener los datos climáticos. Verifica el nombre de la ciudad o tu API Key.");
    }
}

function mostrarClimaActual(datos) {
    nombreCiudad.innerText = `${datos.name}, ${datos.sys.country}`;
    txtTemperatura.innerText = Math.round(datos.main.temp);
    txtDescripcion.innerText = datos.weather[0].description.toUpperCase();
    txtHumedad.innerText = `${datos.main.humidity}%`;
    txtViento.innerText = `${Math.round(datos.wind.speed * 3.6)} km/h`;
    txtPresion.innerText = `${datos.main.pressure} hPa`;
    const codigoIcono = datos.weather[0].icon;
    iconoClima.src = `https://openweathermap.org/img/wn/${codigoIcono}@2x.png`;
    iconoClima.classList.remove("hidden");
}

function renderizarGraficaAnalitica(datos) {
    const proximasLecturas = datos.list.slice(0, 8);
    const etiquetasHoras = proximasLecturas.map(lectura => {
        const fecha = new Date(lectura.dt * 1000);
        return fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    const datosTemperaturas = proximasLecturas.map(lectura => Math.round(lectura.main.temp));

    if (miGrafica) {
        miGrafica.destroy();
    }

    const ctx = document.getElementById('graficaTemperatura').getContext('2d');
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
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#00d2ff',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
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

async function cargarCacheGeografico() {
    if (cacheGeografico) return cacheGeografico;
    const resp = await fetch("data/cities.min.json");
    cacheGeografico = await resp.json();
    return cacheGeografico;
}

async function cargarPaises() {
    try {
        const resp = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2");
        const paises = await resp.json();
        paises.sort((a, b) => a.name.common.localeCompare(b.name.common));
        selectPais.innerHTML = '<option value="">🌍 País</option>';
        for (const p of paises) {
            const opt = document.createElement("option");
            opt.value = p.cca2;
            opt.textContent = p.name.common;
            selectPais.appendChild(opt);
        }
    } catch (err) {
        console.error("Error al cargar países:", err);
    }
}

async function cargarEstados() {
    const iso2 = selectPais.value;
    selectEstado.innerHTML = '<option value="">🗺️ Departamento/Estado</option>';
    selectCiudad.innerHTML = '<option value="">📍 Ciudad/Localidad</option>';
    selectDistrito.innerHTML = '<option value="">📍 Distrito</option>';
    selectEstado.disabled = true;
    selectCiudad.disabled = true;
    selectDistrito.disabled = true;

    if (!iso2) return;

    try {
        const datos = await cargarCacheGeografico();
        const pais = datos[iso2];
        if (!pais) return;

        for (const est of pais.states) {
            const opt = document.createElement("option");
            opt.value = est.name;
            opt.textContent = est.name;
            selectEstado.appendChild(opt);
        }
        selectEstado.disabled = false;
    } catch (err) {
        console.error("Error al cargar estados:", err);
    }
}

async function cargarCiudades() {
    const iso2 = selectPais.value;
    const estadoNombre = selectEstado.value;
    selectCiudad.innerHTML = '<option value="">📍 Ciudad/Localidad</option>';
    selectDistrito.innerHTML = '<option value="">📍 Distrito</option>';
    selectCiudad.disabled = true;
    selectDistrito.disabled = true;

    if (!iso2 || !estadoNombre) return;

    try {
        const datos = await cargarCacheGeografico();
        const pais = datos[iso2];
        if (!pais) return;

        const estado = pais.states.find(e => e.name === estadoNombre);
        if (!estado) return;

        for (const c of estado.cities) {
            const opt = document.createElement("option");
            opt.value = c;
            opt.textContent = c;
            selectCiudad.appendChild(opt);
        }
        selectCiudad.disabled = false;
    } catch (err) {
        console.error("Error al cargar ciudades:", err);
    }
}

async function cargarDistritos() {
    const ciudad = selectCiudad.value;
    const iso2 = selectPais.value;
    selectDistrito.innerHTML = '<option value="">📍 Distrito</option>';
    selectDistrito.disabled = true;
    if (!ciudad) return;

    try {
        const query = `[out:json];area["ISO3166-1"="${iso2}"]->.country;area["name"="${ciudad}"](area.country)->.cityArea;(node(area.cityArea)["place"~"suburb|quarter|neighbourhood|borough|district"];way(area.cityArea)["place"~"suburb|quarter|neighbourhood|borough|district"];rel(area.cityArea)["place"~"suburb|quarter|neighbourhood|borough|district"];);out center tags(50);`;
        const resp = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "data=" + encodeURIComponent(query)
        });
        if (!resp.ok) throw new Error("Overpass respondió con " + resp.status);
        const data = await resp.json();
        const distritos = [...new Set(data.elements
            .filter(el => el.tags && el.tags.name)
            .map(el => el.tags.name))]
            .sort((a, b) => a.localeCompare(b));
        for (const d of distritos) {
            const opt = document.createElement("option");
            opt.value = d;
            opt.textContent = d;
            selectDistrito.appendChild(opt);
        }
        selectDistrito.disabled = distritos.length === 0;
    } catch (err) {
        console.warn("Distritos no disponibles para esta ciudad:", err);
    }
}

selectPais.addEventListener("change", cargarEstados);

selectEstado.addEventListener("change", cargarCiudades);

selectCiudad.addEventListener("change", () => {
    const ciudad = selectCiudad.value;
    if (!ciudad) return;
    cargarDistritos();
    const iso2 = selectPais.value;
    const estado = selectEstado.value;
    cargarDatosPorCiudad(ciudad, estado, iso2);
});

selectDistrito.addEventListener("change", () => {
    const distrito = selectDistrito.value;
    if (!distrito) return;
    const ciudad = selectCiudad.value;
    const iso2 = selectPais.value;
    const estado = selectEstado.value;
    cargarDatosPorCiudad(ciudad, estado, iso2, distrito);
});

btnBuscar.addEventListener("click", () => cargarDatosPorCiudad(inputCiudad.value));
inputCiudad.addEventListener("keypress", (e) => {
    if (e.key === "Enter") cargarDatosPorCiudad(inputCiudad.value);
});

cargarPaises();
obtenerUbicacionActual();
