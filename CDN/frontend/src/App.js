import React, { useState } from "react";
import axios from "axios";

function App() {
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Sélectionne une image d'abord !");
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImageUrl(res.data.imageUrl);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Uploader une image sur le CDN</h2>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Uploader</button>

      {imageUrl && (
        <div>
          <h3>Image récupérée depuis le CDN :</h3>
          <img src={imageUrl} alt="Uploaded" width="300" />
        </div>
      )}
    </div>
  );
}

export default App;
