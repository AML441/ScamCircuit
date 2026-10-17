import IncidentForm from "./components/IncidentForm";
import { IncidentFormProvider } from "./components/IncidentFormContext";

export default function home() {
   return (

    <>
        <h1 className="text-5xl font-bold flex justify-center mt-10"> Welcome to ScamCircuit!</h1>
          <IncidentFormProvider>
            <IncidentForm/>
          </IncidentFormProvider>
        
    
    </>
   )
}
