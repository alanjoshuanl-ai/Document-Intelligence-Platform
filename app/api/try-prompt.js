import axios from "axios";

export default async function handler(req, res) {
  try {
    const response = await axios.post(
      "http://35.222.15.168:8080/try-prompt/",
      req.body,
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(200).json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
