import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/quest-ui.css';
import './styles/components.css';
import './styles/app.css';

// No StrictMode: the three.js town is created exactly once and lives for the whole visit.
createRoot(document.getElementById('root')).render(<App />);
