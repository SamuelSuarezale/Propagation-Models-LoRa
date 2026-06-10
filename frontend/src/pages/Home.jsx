import './Home.css'
import systemDiagram from '../assets/system_diagram.png'
import logoProgramma from '../assets/logo_programa.png'
import logoTeleco from '../assets/logo.png'

function Home() {
    return (
        <div className="home">
            <div className="home-header">
                <img src={logoTeleco} alt="Logo Telecomunicaciones" className="home-logo" />
                <div className="home-header-text">
                    <h1 className="home-title">
                        Caracterización y Modelado de Propagación LoRa 915 MHz
                        mediante Mediciones LOS/NLOS
                    </h1>
                </div>
                <img src={logoProgramma} alt="Logo Programa" className="home-logo" />
            </div>

            <div className="home-info">
                <div className="home-card">
                    <h2>Descripción del Proyecto</h2>
                    <p>
                        Modelado matemático de la propagación de señales LoRa en la banda ISM
                        de 915 MHz, mediante la recolección de datos experimentales en escenarios
                        LOS (Line of Sight) y NLOS (Non Line of Sight) en entorno urbano.
                        Se emplean dos nodos Heltec WiFi LoRa 32 V3 como transmisor y receptor,
                        junto con sensores IoT embebidos, para caracterizar la pérdida de
                        trayectoria y ajustar mediante datos reales modelos de propagación
                        que se adapten mejor a la transmisión de datos.
                    </p>
                </div>

                <div className="home-card">
                    <h2>Parámetros de Medición</h2>
                    <ul>
                        <li>Frecuencia: 915 MHz</li>
                        <li>Longitud de onda: 32.8 cm</li>
                        <li>Intervalo de medición: 50λ = 16.4 m</li>
                        <li>LOS: hasta 400 m — 25 puntos</li>
                        <li>NLOS: hasta 200 m — 12 puntos</li>
                        <li>Muestras por punto: 30 (1 por segundo)</li>
                    </ul>
                </div>
            </div>

            <div className="home-diagram">
                <h2>Arquitectura del Sistema</h2>
                <img src={systemDiagram} alt="Diagrama del sistema LoRa" className="home-diagram-img" />
            </div>
        </div>
    )
}

export default Home