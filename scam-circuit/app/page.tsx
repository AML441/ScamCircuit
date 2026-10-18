import IncidentForm from "./components/IncidentForm";
import { IncidentFormProvider } from "./components/IncidentFormContext";
import NavBar from "./components/NavBar";

export default function home() {
   return (

    <>
        <NavBar/>
          <IncidentFormProvider>
            <IncidentForm/>
          </IncidentFormProvider>
        
    
    </>
   )
}
