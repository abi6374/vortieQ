const https = require('https');

const testUrls = [
  "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1676299081847-824916de030a?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1655720828018-edd2daec9349?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=800&q=80"
];

testUrls.forEach(url => {
  https.get(url, (res) => {
    console.log(res.statusCode, url);
  }).on('error', (e) => {
    console.error('Error:', url, e.message);
  });
});
