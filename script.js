///////////////////////////////////////////////////////////////////
// Configs                                                     ////
///////////////////////////////////////////////////////////////////

let config =
{
  atomicNumber: 114, // Atomic number
  zamp: 0.4, // Z amplitude for animations
  smoothness: 2000, // Animation smoothness: higher is smoother
  animate: true, // Freeze animation by making this false
  rotationSpeed: 0.008, // Speed for rotation across the y axis
  autozoom: true, // Whether to autozoom into the atom and electrons when you change the atomic number
  shouldRecord: false,
  shouldRotate: true,
  recordingDuration: 15_000
}

///////////////////////////////////////////////////////////////////
// Camera                                                      ////
///////////////////////////////////////////////////////////////////

// Create scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create controls for panning
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Enable smooth damping of rotation
controls.dampingFactor = 0.50; // Set damping factor for smoothness

// Set the camera position
camera.position.z = 5;

///////////////////////////////////////////////////////////////////
// Nucleus                                                     ////
///////////////////////////////////////////////////////////////////

// Create nucleus (a sphere)
const nucleusGeometry = new THREE.SphereGeometry(0.25, 32, 32); // Radius 0.25, 32 width and height segments
const nucleusMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow color
const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);

// Add nucleus to the scene
scene.add(nucleus);

///////////////////////////////////////////////////////////////////
// Electrons                                                   ////
///////////////////////////////////////////////////////////////////

// Define shells and colors
let shells = getShells(config.atomicNumber);
const colors = [0xFF5733, 0x33FF57, 0x3357FF, 0xFF33F6, 0xFFFF33, 0x33FFF6];

// Create a group to hold the electrons
const electronsGroup = new THREE.Group();

// Iterate over shells
iterateShells();

function iterateShells()
{
  // Iterate over shells
  for (let shell of shells) 
  {
    const numberOfElectrons = shell.electrons.length;
    const radius = shell.radius;
    const color = colors[shells.indexOf(shell) % colors.length];

    for (let i = 0; i < numberOfElectrons; i++)
    {
      const electronGeometry = new THREE.SphereGeometry(0.05, 16, 16);
      const electronMaterial = new THREE.MeshBasicMaterial({ color: color });
      const electron = new THREE.Mesh(electronGeometry, electronMaterial);
      const angle = (i / numberOfElectrons) * 2 * Math.PI;
      electron.position.set(radius * Math.cos(angle), radius * Math.sin(angle), 0);
      electron.angle = angle; // Store initial angle
      electronsGroup.add(electron);
      shell.electrons[i] = electron; // Assign the electron to the shell
    }
  }
}

function getShells(atomicNumber) 
{
  const maxElectronsInShells = [2, 8, 18, 32, 32, 18, 8];
  let shells = [];
  let remainingElectrons = atomicNumber;

  for (let maxElectrons of maxElectronsInShells)
   {
    let electronsInShell = Math.min(maxElectrons, remainingElectrons);
    shells.push(
    {
      electrons: Array(electronsInShell).fill(null),
      radius: (shells.length + 1) / 2 // Dividing by 2, or any constant to bring them closer
    });

    remainingElectrons -= electronsInShell;
    if (remainingElectrons === 0) break;
  }

  return shells;
}

function animateElectrons() 
{
  for (let shellIndex = 0; shellIndex < shells.length; shellIndex++) 
  {
    const shell = shells[shellIndex];
    const electronsInShell = shell.electrons;

    for (let electronIndex = 0; electronIndex < electronsInShell.length; electronIndex++) 
    {
      const electron = electronsInShell[electronIndex];
      const angleIncrement = 2 * Math.PI / config.smoothness; // Increment angle for smooth motion: higher denom -> slower motion
      const currentAngle = (electron.angle + angleIncrement) % (2 * Math.PI); // Calculate new angle

      // Update electron's angle
      electron.angle = currentAngle;

      // Compute new position based on angle
      const radius = shell.radius;
      const x = radius * Math.cos(currentAngle);
      const y = radius * Math.sin(currentAngle);

      // Modify Z position based on shell
      let z = 0;
      if (shellIndex === 0) z = 0; // 1st shell (s orbital), spherical
      else if (shellIndex === 1) z = config.zamp * Math.sin(2 * currentAngle); // 2nd shell (p orbital), dumbbell shape
      else if (shellIndex === 2) z = config.zamp * Math.sin(3 * currentAngle); // 3rd shell, combination of s and p
      else if (shellIndex === 3) z = config.zamp * Math.sin(4 * currentAngle); // 4th shell, combination of s, p, and d
      else if (shellIndex === 4) z = config.zamp * Math.sin(5 * currentAngle); // 5th shell
      else if (shellIndex === 5) z = config.zamp * Math.sin(6 * currentAngle); // 6th shell
      else if (shellIndex === 6) z = config.zamp * Math.sin(7 * currentAngle); // 7th shell
      else z = config.zamp * Math.sin((shellIndex + 2) * currentAngle); // Higher shells, more complex

      // Set the new electron position
      electron.position.set(x, y, z);
    }
  }
}

function removeElectrons()
{
  // Clear the electrons group by removing all its children
  for (const child of electronsGroup.children.slice()) electronsGroup.remove(child);
}

function getMaxElectronDistance() 
{
  // Calculate the number of shells for the current atomic number
  let numberOfShells = getShells(config.atomicNumber).length;

  // Compute the maximum radial distance and maximum z-coordinate
  let maxRadialDistance = numberOfShells / 2;
  let maxZ = config.zamp * (numberOfShells + 2);

  // Return the maximum 3D distance
  return Math.sqrt(2 * Math.pow(maxRadialDistance, 2) + Math.pow(maxZ, 2));
}

function reset()
{
  console.log(`New atomic number is ${config.atomicNumber}`);
  removeElectrons();

  // Reset rotation
  rotatingGroup.rotation.y = 0;

  // Clear existing electrons group
  electronsGroup.children = [];

  // Add electrons again
  shells = getShells(config.atomicNumber);

  // Iterate over shells
  iterateShells();

  // Adjust the camera position based on the maximum electron distance
  if (config.autozoom) camera.position.z = getMaxElectronDistance() * 1.5; // Adjust the multiplier as needed

}

///////////////////////////////////////////////////////////////////
// Rotate                                                      ////
///////////////////////////////////////////////////////////////////

let rotatingGroup = null;

function initRotation()
{
  // Create a group to hold all the objects
  rotatingGroup = new THREE.Group();

  // Add the existing objects to the group
  rotatingGroup.add(nucleus);
  rotatingGroup.add(electronsGroup);

  // Add the group to the scene
  scene.add(rotatingGroup);
}


///////////////////////////////////////////////////////////////////
// Zoom                                                        ////
///////////////////////////////////////////////////////////////////

let zoomFactor = 0.01;
const ZOOM_STEP = 0.00001; // The fixed zoom step

// Define a zoom function that takes an amount to zoom in or out
function zoom(delta) 
{
  let zoomChange = ZOOM_STEP * delta;
  zoomFactor += zoomChange;
  zoomFactor = Math.min(Math.max(0.1, zoomFactor), 5); // Constraints between 0.1 and 5
  camera.position.z = 1.0 * zoomFactor;
}

function normalizeWheelDelta(event) 
{
  let delta = event.deltaY;
  if (delta) {
    // Normalizing the delta
    delta = delta > 0 ? 1 : -1;
  }
  return delta;
}

// Add a mouse wheel event listener to handle zooming
document.addEventListener('wheel', function(event) 
{
  const normalizedDelta = normalizeWheelDelta(event);
  zoom(normalizedDelta);
});

///////////////////////////////////////////////////////////////////
// GUI                                                         ////
///////////////////////////////////////////////////////////////////

const gui = new dat.GUI();

gui.add(config, 'atomicNumber', 1, 118, 1).onChange(function(value) { reset(); });
gui.add(config, 'zamp', 0.1, 10).onChange(function(value) {});
gui.add(config, 'smoothness', 1, 10000).onChange(function(value) {});
gui.add(config, 'rotationSpeed', 0.001, 0.025, 0.001).onChange(function(value) {});
gui.add(config, "animate");
gui.add(config, "autozoom");
gui.add(config, "shouldRotate");

///////////////////////////////////////////////////////////////////
// Recording                                                   ////
///////////////////////////////////////////////////////////////////

// Variables to control the recording process
let recording = false;
let currentAtomicNumber = 1;
const maxAtomicNumber = 118; // 118;
const elementNames = ["", "Hydrogen", "Helium", "Lithium", "Beryllium", "Boron", "Carbon", "Nitrogen", "Oxygen", "Fluorine", "Neon", "Sodium", "Magnesium", "Aluminium", "Silicon", "Phosphorus", "Sulfur", "Chlorine", "Argon", "Potassium", "Calcium", "Scandium", "Titanium", "Vanadium", "Chromium", "Manganese", "Iron", "Cobalt", "Nickel", "Copper", "Zinc", "Gallium", "Germanium", "Arsenic", "Selenium", "Bromine", "Krypton", "Rubidium", "Strontium", "Yttrium", "Zirconium", "Niobium", "Molybdenum", "Technetium", "Ruthenium", "Rhodium", "Palladium", "Silver", "Cadmium", "Indium", "Tin", "Antimony", "Tellurium", "Iodine", "Xenon", "Cesium", "Barium", "Lanthanum", "Cerium", "Praseodymium", "Neodymium", "Promethium", "Samarium", "Europium", "Gadolinium", "Terbium", "Dysprosium", "Holmium", "Erbium", "Thulium", "Ytterbium", "Lutetium", "Hafnium", "Tantalum", "Tungsten", "Rhenium", "Osmium", "Iridium", "Platinum", "Gold", "Mercury", "Thallium", "Lead", "Bismuth", "Polonium", "Astatine", "Radon", "Francium", "Radium", "Actinium", "Thorium", "Protactinium", "Uranium", "Neptunium", "Plutonium", "Americium", "Curium", "Berkelium", "Californium", "Einsteinium", "Fermium", "Mendelevium", "Nobelium", "Lawrencium", "Rutherfordium", "Dubnium", "Seaborgium", "Bohrium", "Hassium", "Meitnerium", "Darmstadtium", "Roentgenium", "Copernicium", "Nihonium", "Flerovium", "Moscovium", "Livermorium", "Tennessine", "Oganesson", "Ununennium"];

// CCapture instance
let capturer = new CCapture({
  format: 'webm',
  framerate: 60,
});

function startRecording() 
{
  recording = true;

  // Instantiate a new CCapture object
  capturer = new CCapture({
    format: 'webm',
    framerate: 60,
  });
  
  // Start the capturer
  capturer.start();

  // Set a timer to stop recording after the desired duration
  setTimeout(stopRecording, config.recordingDuration);
}

function stopRecording() 
{
  recording = false;

  // Stop the capturer
  capturer.stop();

  // Save the video
  const oldAtomicNumber = currentAtomicNumber;
  capturer.save((blob) => 
  {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${elementNames[oldAtomicNumber]}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Increment the atomic number and check if there are more to record
  currentAtomicNumber++;
  console.log(`Stopped recording, now at atomic number ${currentAtomicNumber}`);

  // Set the desired atomic number
  config.atomicNumber = currentAtomicNumber;

  // Reset, since we changed the atomic number
  reset();

  if (currentAtomicNumber <= maxAtomicNumber) 
  {
    // Optionally add a delay between recordings
    setTimeout(startRecording, 1000);
  }
}

///////////////////////////////////////////////////////////////////
// Animation                                                   ////
///////////////////////////////////////////////////////////////////

window.addEventListener('resize', function() 
{
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

// Animation loop
function animate() 
{
  requestAnimationFrame(animate);
  if (config.animate) animateElectrons();

  // Gradually rotate the group horizontally
  if (config.animate && config.shouldRotate) rotatingGroup.rotation.y += config.rotationSpeed;

  if (recording) capturer.capture(renderer.domElement);

  controls.update();
  renderer.render(scene, camera);
}

///////////////////////////////////////////////////////////////////
// Launch                                                      ////
///////////////////////////////////////////////////////////////////

if (config.autozoom) camera.position.z = getMaxElectronDistance() * 1.5;
if (config.shouldRotate) initRotation();
if (config.shouldRecord) startRecording(); // Start the recording process for the first atomic number
animate();

///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
