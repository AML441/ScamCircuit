import IncidentForm from "./components/IncidentForm";
import { IncidentFormProvider } from "./components/IncidentFormContext";

export default function home() {
   return (

    <>
        <h1> Welcome to ScamCircuit!</h1>
          <IncidentFormProvider>
          <IncidentForm/>
          </IncidentFormProvider>
        
    
    </>
   )
}
