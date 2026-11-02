import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../services/firebase";

function Login() {

  const login = async () => {

    const result = await signInWithPopup(auth, provider);

    const user = result.user;

    localStorage.setItem("user", JSON.stringify(user));

    window.location.reload();
  };

  return (

    <div style={{
      height:"100vh",
      display:"flex",
      justifyContent:"center",
      alignItems:"center"
    }}>

      <div className="card" style={{textAlign:"center",width:"300px"}}>

        <h2>Student AI Assistant</h2>

        <button className="btn" onClick={login}>
          Login with Google
        </button>

      </div>

    </div>

  );
}

export default Login;