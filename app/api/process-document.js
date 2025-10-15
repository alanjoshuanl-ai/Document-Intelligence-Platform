import axios from "axios";
import formidable from "formidable";

export const config = {
  api: {
    bodyParser: false, // disable built-in body parser for file uploads
  },
};

export default async function handler(req, res) {
  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    try {
      const formData = new FormData();
      if (files.file) {
        formData.append("file", fs.createReadStream(files.file.filepath), files.file.originalFilename);
      }
      if (fields.schema_json) {
        formData.append("schema_json", fields.schema_json);
      }

      const response = await axios.post(
        "http://35.222.15.168:8080/process-document/",
        formData,
        { headers: { ...formData.getHeaders() } }
      );

      res.status(200).json(response.data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
