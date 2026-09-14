import { BrowserRouter } from "react-router-dom";
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import '../src/index.css';

createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
  <StrictMode>
    <App />
  </StrictMode>
  </BrowserRouter>
);
