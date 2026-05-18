import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
global.crypto = { randomUUID: () => 'id-' + Math.random().toString(36).slice(2) };

const { generateClientPDF, generateCompanyPDF } = await import('/dev-server/src/lib/pdfGenerator.ts');
const { createDefaultItem, splitNode } = await import('/dev-server/src/types/configurator.ts');

// Build items
const items = [];
const w1 = createDefaultItem('window');
w1.width=1200; w1.height=1400; w1.hasRoller=true; w1.rollerColor='anthracite';
items.push(w1);

const w2 = createDefaultItem('window');
w2.width=1600; w2.height=1200; w2.color='brown'; w2.hasRoller=true; w2.rollerColor='brown';
w2.rootNode = splitNode(w2.rootNode, 'vertical', w2.width, 2);
items.push(w2);

const w3 = createDefaultItem('window');
w3.width=900; w3.height=1500; w3.color='black';
items.push(w3);

const w4 = createDefaultItem('door');
w4.width=900; w4.height=2100;
items.push(w4);

// override save to write to disk
const fs = await import('fs');
const jsPDF = (await import('jspdf')).default;
const origSave = jsPDF.prototype.save;
jsPDF.prototype.save = function(name){ fs.writeFileSync('/tmp/pdftest/'+name, Buffer.from(this.output('arraybuffer'))); console.log('wrote', name); };

generateClientPDF({name:'Test',phone:'',address:''}, items);
generateCompanyPDF({name:'Test',phone:'',address:''}, items, {type:'veka'});
