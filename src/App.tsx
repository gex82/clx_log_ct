import React from "react"
import { Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import BootMarker from "./components/BootMarker"
import ControlTower from "./pages/ControlTower"
import ExecutiveBrief from "./pages/ExecutiveBrief"
import Network from "./pages/Network"
import Transportation from "./pages/Transportation"
import Distribution from "./pages/Distribution"
import Inventory from "./pages/Inventory"
import Scenarios from "./pages/Scenarios"
import Playbooks from "./pages/Playbooks"
import Data from "./pages/Data"
import GuidedDemo from "./pages/GuidedDemo"

export default function App() {
  return (
    <Layout>
      <BootMarker />
      <Routes>
        <Route path="/" element={<ControlTower />} />
        <Route path="/guided" element={<GuidedDemo />} />
        <Route path="/executive-brief" element={<ExecutiveBrief />} />
        <Route path="/network" element={<Network />} />
        <Route path="/transportation" element={<Transportation />} />
        <Route path="/distribution" element={<Distribution />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/scenarios" element={<Scenarios />} />
        <Route path="/playbooks" element={<Playbooks />} />
        <Route path="/data" element={<Data />} />
      </Routes>
    </Layout>
  )
}
