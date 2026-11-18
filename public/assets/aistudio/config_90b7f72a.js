// CONFIG: fill these to go live. Dummy values = safe demo mode.
// Firebase option: paste your firebaseConfig from console.firebase.google.com
// Node option: set API_BASE to your backend URL (e.g. https://your-api.onrender.com)
// UPI_ID: your real UPI id (format: name@okhdfc etc). Until set, QR shows placeholder text.
const CONFIG = {
  helpline: '+91 00000 00000',
  whatsapp: '910000000000',
  email: 'hello@example.com',
  instagram: 'https://instagram.com',
  upiId: '',                 // <<< SET YOUR REAL UPI ID HERE
  payeeName: 'Rescue Paws Jammu',
  firebaseConfig: null,      // <<< paste firebase config object to enable Firestore
  apiBase: '',               // <<< e.g. 'https://your-express-api.com' for Node+Mongo
  adminEmail: 'admin@gmail.com',
  // demo admin password only for local demo; for production use Firebase Auth
  adminPassDemo: 'password'
};
