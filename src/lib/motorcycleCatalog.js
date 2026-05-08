export const MOTORCYCLE_MAKES = [
  'Aprilia',
  'BMW',
  'Can-Am',
  'CFMoto',
  'Ducati',
  'Harley-Davidson',
  'Honda',
  'Husqvarna',
  'Indian',
  'Kawasaki',
  'KTM',
  'Moto Guzzi',
  'Royal Enfield',
  'Suzuki',
  'Triumph',
  'Yamaha',
  'Zero',
];

export const MOTORCYCLE_MODELS_BY_MAKE = {
  Aprilia: ['RS 660', 'Tuono 660', 'Tuono V4', 'RSV4', 'Tuareg 660'],
  BMW: ['G 310 R', 'F 900 R', 'F 900 GS', 'R 1250 GS', 'R 1300 GS', 'S 1000 RR', 'S 1000 R'],
  'Can-Am': ['Ryker', 'Spyder F3', 'Spyder RT'],
  CFMoto: ['300NK', '450NK', '450SS', '650NK', '700CL-X', 'Ibex 800'],
  Ducati: ['Monster', 'Scrambler', 'Panigale V2', 'Panigale V4', 'Streetfighter V4', 'Multistrada V4'],
  'Harley-Davidson': ['Sportster S', 'Nightster', 'Street Bob', 'Low Rider S', 'Road Glide', 'Street Glide', 'Pan America'],
  Honda: ['Grom', 'Rebel 300', 'Rebel 500', 'Rebel 1100', 'CB300R', 'CB500F', 'CB650R', 'CBR500R', 'CBR600RR', 'CBR1000RR-R', 'Africa Twin', 'Gold Wing'],
  Husqvarna: ['Svartpilen 401', 'Vitpilen 401', 'Norden 901', 'FE 501S'],
  Indian: ['Scout', 'Scout Bobber', 'Chief', 'Chieftain', 'Roadmaster', 'FTR'],
  Kawasaki: ['Ninja 400', 'Ninja 500', 'Ninja 650', 'Ninja ZX-6R', 'Ninja ZX-10R', 'Z400', 'Z500', 'Z650', 'Z900', 'Versys 650', 'KLR 650', 'Vulcan S'],
  KTM: ['390 Duke', '390 Adventure', '690 SMC R', '790 Duke', '890 Duke R', '890 Adventure', '1290 Super Adventure'],
  'Moto Guzzi': ['V7', 'V85 TT', 'V100 Mandello'],
  'Royal Enfield': ['Hunter 350', 'Classic 350', 'Meteor 350', 'Himalayan', 'Interceptor 650', 'Continental GT 650', 'Super Meteor 650'],
  Suzuki: ['GSX250R', 'GSX-8R', 'GSX-8S', 'GSX-R600', 'GSX-R750', 'GSX-R1000R', 'SV650', 'V-Strom 650', 'V-Strom 800DE', 'Hayabusa'],
  Triumph: ['Speed 400', 'Scrambler 400 X', 'Trident 660', 'Street Triple', 'Speed Triple', 'Bonneville T120', 'Tiger 900', 'Tiger 1200'],
  Yamaha: ['YZF-R3', 'YZF-R7', 'YZF-R1', 'MT-03', 'MT-07', 'MT-09', 'MT-10', 'XSR700', 'XSR900', 'Tenere 700', 'Bolt'],
  Zero: ['FXE', 'S', 'SR', 'SR/F', 'SR/S', 'DSR/X'],
};

export function getModelSuggestions(make) {
  const normalizedMake = String(make || '').trim().toLowerCase();
  const match = MOTORCYCLE_MAKES.find((item) => item.toLowerCase() === normalizedMake);
  return match ? MOTORCYCLE_MODELS_BY_MAKE[match] || [] : [];
}
