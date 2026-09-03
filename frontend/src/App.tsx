import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Overview } from './pages/Overview';
import { LossDiscovery } from './pages/LossDiscovery';
import { PatternInvestigation } from './pages/PatternInvestigation';
import { DecisionCenter } from './pages/DecisionCenter';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="discovery" element={<LossDiscovery />} />
          <Route path="explorer" element={<LossDiscovery />} />
          <Route path="investigation/:patternId" element={<PatternInvestigation />} />
          <Route path="investigation" element={<PatternInvestigation />} />
          <Route path="decision/:patternId" element={<DecisionCenter />} />
          <Route path="decision" element={<DecisionCenter />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
