import IncidentForm from "./components/IncidentForm";
import { IncidentFormProvider } from "./components/IncidentFormContext";

export default function Home() {
  return <IncidentFormProvider><IncidentForm /></IncidentFormProvider>;
}
