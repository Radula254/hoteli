import { useEffect, useState } from "react";
import axios from "axios";
import Perks from "../Perks";
import PhotosUploader from "../PhotosUploader";
import AccountNav from "../AccountNav";
import { Navigate, useParams } from "react-router-dom";

export default function PlacesFormPage() {

    const {id} = useParams();
    const [title, setTitle] = useState('');
    const [address, setAddress] = useState('');
    const [addedPhotos, setAddedPhotos] = useState([]);
    const [description, setDescription] = useState('');
    const [perks, setPerks] = useState([]);
    const [extraInfo, setExtraInfo] = useState('');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [maxGuests, setMaxGuests] = useState(1);
    const [price, setPrice] = useState(100);
    const [redirect, setRedirect] = useState(false);

    useEffect(() => {
        if (!id) {
            return;
        }
        axios.get('/places/'+id).then(response => {
            const {data} = response;
            setTitle(data.title);
            setAddress(data.address);
            setAddedPhotos(data.photos);
            setDescription(data.description);
            setPerks(data.perks);
            setExtraInfo(data.extraInfo);
            setCheckIn(data.checkIn);
            setCheckOut(data.checkOut);
            setMaxGuests(data.maxGuests);
            setPrice(data.price);
        });
    }, [id]);

    function inputHeader(text) {
        return (
            <h2 className="text-2xl mt-4">{text}</h2>
        );
    }

    function inputDescription(text) {
        return (
            <p className="text-gray-500 text-sm">{text}</p>
        );
    }

    function preInput(header,description) {
        return (
            <>
              {inputHeader(header)}
              {inputDescription(description)}
            </>
        );
    }

    async function savePlace(ev) {
        ev.preventDefault();
        const placeData = {
            title, address, addedPhotos, 
            description, perks, extraInfo, 
            checkIn, checkOut, maxGuests, price
        }
        if (id) {
            //update
            await axios.put('/places', {
                id,  ...placeData
            });
            setRedirect(true);
        } else {
            //add a new place
            await axios.post('/places', placeData);
            setRedirect(true);
        }
    }

    if (redirect) {
        return <Navigate to={'/account/places'} />
    }

    return (
            <div>
                <AccountNav />
                <form onSubmit={savePlace}>
                    {preInput('Title:', 'Make it short and sweet!')}
                    <input type='text' value={title} onChange={ev => setTitle(ev.target.value)} placeholder="Title, for example: The Coastal Paradise"/> 
                    {preInput('Address:', 'Exact Location of this place.')}
                    <input type='text' value={address} onChange={ev => setAddress(ev.target.value)} placeholder="addresss" />
                    {preInput('Photos:', 'Quality photos of the place. More = Better')}
                    <PhotosUploader addedPhotos={addedPhotos} onChange={setAddedPhotos} />
                    {preInput('Description:', 'Description of the place')}
                    <textarea value={description} onChange={ev => setDescription(ev.target.value)}/>
                    {preInput('Perks:', 'Select all place perks')}
                    <div className="grid mt-2 gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                        <Perks selected={perks} onChange={setPerks}/>
                    </div>
                    {preInput('Extra Info:', 'Add any extra info such as rules, etc.')}
                    <textarea value={extraInfo} onChange={ev => setExtraInfo(ev.target.value)} />
                    {preInput('Check In & Out Times:', 'Add checkin and checkout times. Remember to have some cleaning time allocated before guests arrive.')}
                    <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                        <div>
                            <h3 className="mt-2 -mb-1">Check In Time</h3>
                            <input type='text'value={checkIn} onChange={ev => setCheckIn(ev.target.value)} placeholder="14"/>
                        </div>
                        <div>
                            <h3 className="mt-2 -mb-1">Check Out Time</h3>
                            <input type='text' value={checkOut} onChange={ev => setCheckOut(ev.target.value)} placeholder="11"/>
                        </div>
                        <div>
                            <h3 className="mt-2 -mb-1">Max number of guests</h3>
                            <input type='number' value={maxGuests} onChange={ev => setMaxGuests(ev.target.value)} />
                        </div>
                        <div>
                            <h3 className="mt-2 -mb-1">Price Per Night</h3>
                            <input type='number' value={price} onChange={ev => setPrice(ev.target.value)} />
                        </div>
                    </div>
                    <button className="primary my-4">Save</button>
                </form>
            </div>
    )
}