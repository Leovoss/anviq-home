import { Route, Routes } from "react-router-dom";
import { Cookies } from "@/pages/Cookies";
import { Home } from "@/pages/Home";
import { Privacy } from "@/pages/Privacy";
import { Terms } from "@/pages/Terms";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/explore/:section" element={<Home />} />
      <Route path="/projects/:project" element={<Home />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/cookies" element={<Cookies />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
export default App;
