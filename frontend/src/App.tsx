import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Board } from './components/Board/Board';
import { Lobby } from './components/Lobby/Lobby';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/board/:sessionId" element={<Board />} />
      </Routes>
    </BrowserRouter>
  );
}
