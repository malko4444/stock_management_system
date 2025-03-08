import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import { DeleteHistory } from "./pages/DeleteHistory";
import { NavBar } from "./components/NavBar";

export const App = () => {
  return (
    <BrowserRouter>
      <NavBar /> {/* Move NavBar inside BrowserRouter */}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/deletehistory" element={<DeleteHistory />} />
          {/* <Route path="*" element={<h2>404 - Page Not Found</h2>} /> 404 Page Handling */}
        </Routes>
      </main>
    </BrowserRouter>
  );
};
