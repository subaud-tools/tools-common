// A record file's entry: the demo's Record drawn from the data the file
// carries, with no server. build/record-bundle.mjs bundles it with the kit
// inlined; build_test.go writes the file and opens it from disk.
import { bar, embeddedData, initTheme } from '/_kit/kit.js';
import { demoRecord } from './record.js';

const root = document.getElementById('app');
// Read before anything is drawn into the file it copies.
const carried = embeddedData('kit-record');
const b = bar({ brand: { name: 'kitdemo' } });
initTheme('kitdemo', b.themeControl);
root.append(b.el);
demoRecord(root, carried.data);
document.body.dataset.ok = '1';
