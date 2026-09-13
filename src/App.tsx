import { Navigate, Route, Routes } from "react-router-dom";
import { Home } from "@/pages/Home";

function App() {
  return (
    <Routes>
      {/* Retired sections first: the router ranks static segments above
          /explore/:section anyway, but the order says so out loud. Home
          guards these ids too, so the redirect does not depend on ranking. */}
      <Route path="/explore/founder" element={<Navigate to="/explore/about" replace />} />
      <Route path="/explore/ship-log" element={<Navigate to="/explore/projects" replace />} />
      <Route path="/privacy" element={<Navigate to="/explore/privacy" replace />} />
      <Route path="/cookies" element={<Navigate to="/explore/cookies" replace />} />
      <Route path="/terms" element={<Navigate to="/explore/terms" replace />} />
      <Route path="/" element={<Home />} />
      <Route path="/explore/:section" element={<Home />} />
      <Route path="/projects/:project" element={<Home />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
export default App;
