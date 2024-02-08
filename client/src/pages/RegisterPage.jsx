import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function RegisterPage() {

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    async function registerUser(ev) {
        ev.preventDefault();
        try {
            await axios.post('/register', {
                name,
                email,
                password,
            });
            navigate('/'); // Redirect to login page after successful registration
        } catch (e) {
            alert('Please Login')
        }
    }

    return(
        <div className='mt-4 grow flex items-center justify-around'>
            <div className="mb-32">
                <h1 className="text-4xl text-center mb-4">Register</h1>
                <form className="max-w-md mx-auto " onSubmit={registerUser}>
                    <input type='text' placeholder='Your Name(John Doe)' value={name} onChange={ev => setName(ev.target.value)} />
                    <input type='email' placeholder='your@gmail.com' value={email} onChange={ev => setEmail(ev.target.value)} />
                    <input type='password' placeholder='password' value={password} onChange={ev => setPassword(ev.target.value)} />
                    <button className="primary">Register</button>
                    <div className="text-center py-2 text-gray-500">
                        Do you already have an account? <Link className="underline text-black" to={'/login'}>Login</Link><br />
                        After filling in the registration details, press the register button then go to login.
                    </div>
                </form>
            </div>
        </div>
    )
}
