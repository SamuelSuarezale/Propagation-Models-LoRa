import { NavLink } from 'react-router-dom'
import './Sidebar.css'

const links = [
    { path: '/',              label: 'Inicio' },
    { path: '/dashboard',    label: 'Dashboard' },
    { path: '/measurements', label: 'Mediciones' },
    { path: '/models',       label: 'Modelos' },
]

function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <p className="sidebar-programa">Comunicaciones</p>
                <p className="sidebar-programa">Móviles y Satelitales</p>
                <p className="sidebar-uni">Unipamplona</p>
            </div>
            <nav className="sidebar-nav">
                {links.map(link => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        end
                        className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
                    >
                        {link.label}
                    </NavLink>
                ))}
            </nav>
    </aside>
    )
}

export default Sidebar