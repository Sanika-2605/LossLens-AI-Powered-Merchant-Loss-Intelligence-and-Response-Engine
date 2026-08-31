import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Overview } from './pages/Overview';
import { Ecosystem } from './pages/Ecosystem';
import { Transactions } from './pages/Transactions';
import { GraphExplorer } from './pages/GraphExplorer';
import { EventMonitor } from './pages/EventMonitor';
import { LossDiscovery } from './pages/LossDiscovery';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="ecosystem" element={<Ecosystem />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="graph" element={<GraphExplorer />} />
          <Route path="discovery" element={<LossDiscovery />} />
          <Route path="events" element={<EventMonitor />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
