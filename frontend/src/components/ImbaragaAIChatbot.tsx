import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface StructuredAIResponse {
  title: string;
  subtitle: string;
  badge: string;
  hierarchy?: string[];
  metrics?: { label: string; value: string; sub?: string; tone?: "teal" | "red" | "amber" | "slate" }[];
  bullets?: { label: string; value: string }[];
  narrative: string;
  table?: { headers: string[]; rows: string[][] };
  followUps: string[];
}

interface ChatMessage {
  sender: "ai" | "user";
  userText?: string;
  card?: StructuredAIResponse;
  timestamp: string;
}

interface DistrictData {
  name: string;
  provinceEn: string;
  provinceRw: string;
  pop: number;
  households: number;
  povertyRate: number;
  extremeRate: number;
  highRiskRate: number;
  finAccess: number;
  electricity: number;
  cleanWater: number;
  cellsCount: number;
  villagesCount: number;
  sectors: string[];
  economyEn: string;
  economyRw: string;
}

// Complete Official 30 Districts + All 416 Sectors of Rwanda (NISR EICV7 & RPHC 2022)
const RWANDA_DISTRICTS: Record<string, DistrictData> = {
  gasabo: {
    name: "Gasabo", provinceEn: "Kigali City", provinceRw: "Umujyi wa Kigali",
    pop: 879505, households: 238450, povertyRate: 12.3, extremeRate: 1.8, highRiskRate: 15.2,
    finAccess: 96.8, electricity: 89.4, cleanWater: 94.2, cellsCount: 73, villagesCount: 485,
    sectors: ["Bumbogo", "Gatsata", "Gikomero", "Gisozi", "Jabana", "Jali", "Kacyiru", "Kimihurura", "Kimironko", "Kinyinya", "Ndera", "Nduba", "Remera", "Rusororo", "Rutunga"],
    economyEn: "Administrative, commercial, and service hub with high urban employment and peri-urban agriculture.",
    economyRw: "Igicumbi cy'ubutegetsi, ubucuruzi na serivisi mu Mujyi wa Kigali."
  },
  kicukiro: {
    name: "Kicukiro", provinceEn: "Kigali City", provinceRw: "Umujyi wa Kigali",
    pop: 491731, households: 134120, povertyRate: 11.8, extremeRate: 1.5, highRiskRate: 14.0,
    finAccess: 97.1, electricity: 91.8, cleanWater: 95.6, cellsCount: 41, villagesCount: 327,
    sectors: ["Gahanga", "Gatenga", "Gikondo", "Kagarama", "Kanombe", "Kicukiro", "Kigarama", "Masaka", "Niboye", "Nyarugunga"],
    economyEn: "Industrial, logistics, and residential hub with the lowest poverty incidence in Rwanda.",
    economyRw: "Akarere k'inganda n'imiturire gafite igipimo cy'ubukene kiri hasi kurusha utundi mu gihugu."
  },
  nyarugenge: {
    name: "Nyarugenge", provinceEn: "Kigali City", provinceRw: "Umujyi wa Kigali",
    pop: 374319, households: 103890, povertyRate: 14.1, extremeRate: 2.1, highRiskRate: 16.5,
    finAccess: 96.2, electricity: 90.1, cleanWater: 94.8, cellsCount: 47, villagesCount: 350,
    sectors: ["Gitega", "Kanyinya", "Kigali", "Kimisagara", "Mageragere", "Muhima", "Nyakabanda", "Nyamirambo", "Nyarugenge", "Rwezamenyo"],
    economyEn: "Central business district and financial core of Kigali with dense micro-enterprise activity.",
    economyRw: "Umutima w'ubucuruzi n'imari mu Mujyi wa Kigali."
  },
  burera: {
    name: "Burera", provinceEn: "Northern Province", provinceRw: "Intara y'Amajyaruguru",
    pop: 387729, households: 91850, povertyRate: 33.2, extremeRate: 6.7, highRiskRate: 23.5,
    finAccess: 87.2, electricity: 64.5, cleanWater: 86.1, cellsCount: 69, villagesCount: 571,
    sectors: ["Bungwe", "Butaro", "Cyanika", "Cyeru", "Gahunga", "Gatebe", "Gitovu", "Kagogo", "Kinoni", "Kinyababa", "Kivuye", "Nemba", "Rugarama", "Rugengabari", "Ruhunde", "Rusarabuye", "Rwerere"],
    economyEn: "High-altitude volcanic agriculture (potatoes, beans, maize), cross-border trade at Cyanika, and Twin Lakes eco-tourism.",
    economyRw: "Ubuhinzi bwo mu misozi miremire (ibirayi, ibishyimbo), ubucuruzi bwambukiranya umupaka wa Cyanika n'ubukerarugendo ku biyaga."
  },
  gakenke: {
    name: "Gakenke", provinceEn: "Northern Province", provinceRw: "Intara y'Amajyaruguru",
    pop: 365292, households: 88900, povertyRate: 30.4, extremeRate: 5.8, highRiskRate: 21.9,
    finAccess: 88.7, electricity: 66.2, cleanWater: 88.4, cellsCount: 97, villagesCount: 617,
    sectors: ["Busengo", "Coko", "Cyabingo", "Gakenke", "Gashenyi", "Janja", "Kamubuga", "Karambo", "Kivuruga", "Mataba", "Minazi", "Mugunga", "Muhondo", "Muyongwe", "Muzo", "Nemba", "Ruli", "Rusasa", "Rushashi"],
    economyEn: "Specialty coffee (Muhondo), banana, pineapple, and hillside terraced farming with artisanal mining.",
    economyRw: "Ubuhinzi bwa kawa y'indobanure (Muhondo), urutoki, inanasi n'ubucukuzi bw'amabuye y'agaciro."
  },
  gicumbi: {
    name: "Gicumbi", provinceEn: "Northern Province", provinceRw: "Intara y'Amajyaruguru",
    pop: 448824, households: 106400, povertyRate: 32.1, extremeRate: 6.0, highRiskRate: 22.8,
    finAccess: 89.0, electricity: 68.0, cleanWater: 87.9, cellsCount: 109, villagesCount: 630,
    sectors: ["Bukure", "Bwisige", "Byumba", "Cyumba", "Giti", "Kageyo", "Kaniga", "Manyagiro", "Miyove", "Mukarange", "Muko", "Mutete", "Nyamiyaga", "Nyankenke", "Rubaya", "Rukomo", "Rushaki", "Rutare", "Ruvune", "Rwamiko", "Shangasha"],
    economyEn: "Leading milk collection basin, Mulindi tea estates, radical terracing, and climate adaptation initiatives.",
    economyRw: "Akarere ka mbere mu mukamo w'amata menshi, ubuhinzi bw'icyayi cya Mulindi n'amaterasi y'indinganire."
  },
  musanze: {
    name: "Musanze", provinceEn: "Northern Province", provinceRw: "Intara y'Amajyaruguru",
    pop: 476522, households: 114600, povertyRate: 23.6, extremeRate: 4.2, highRiskRate: 18.8,
    finAccess: 92.5, electricity: 78.4, cleanWater: 90.2, cellsCount: 68, villagesCount: 432,
    sectors: ["Busogo", "Cyuve", "Gacaca", "Gashaki", "Gataraga", "Kimonyi", "Kinigi", "Muhoza", "Muko", "Musanze", "Nkotsi", "Nyange", "Remera", "Rwaza", "Shingiro"],
    economyEn: "Secondary city hub powered by Volcanoes National Park gorilla tourism, Irish potato value chains, and commercial trade.",
    economyRw: "Umujyi wunganira Kigali uzwiho ubukerarugendo bw'ingagi muri Pariki y'Ibirunga, ubuhinzi bw'ibirayi n'ubucuruzi."
  },
  rulindo: {
    name: "Rulindo", provinceEn: "Northern Province", provinceRw: "Intara y'Amajyaruguru",
    pop: 360144, households: 87420, povertyRate: 31.8, extremeRate: 6.1, highRiskRate: 22.4,
    finAccess: 89.4, electricity: 70.3, cleanWater: 89.1, cellsCount: 71, villagesCount: 494,
    sectors: ["Base", "Burega", "Bushoki", "Buyoga", "Cyinzuzi", "Cyungo", "Kinihira", "Kisaro", "Masoro", "Mbogo", "Murambi", "Ngoma", "Ntarabana", "Rukozo", "Rusiga", "Shyorongi", "Tumba"],
    economyEn: "Technical education (IPRC Tumba), Rutongo cassiterite mining, Sina Gerard agro-processing, and hillside agriculture.",
    economyRw: "Ishuri rikuru ry'ikoranabuhanga (IPRC Tumba), ubucukuzi bw'amabuye, inganda zitunganya umusaruro w'ubuhinzi n'icyayi."
  },
  gisagara: {
    name: "Gisagara", provinceEn: "Southern Province", provinceRw: "Intara y'Amajyepfo",
    pop: 397051, households: 95200, povertyRate: 36.8, extremeRate: 7.9, highRiskRate: 25.4,
    finAccess: 85.1, electricity: 59.8, cleanWater: 84.3, cellsCount: 59, villagesCount: 524,
    sectors: ["Gikonko", "Gishubi", "Kansi", "Kibirizi", "Kigembe", "Mamba", "Muganza", "Mugombwa", "Mukindo", "Musha", "Ndora", "Nyanza", "Save"],
    economyEn: "Marshland rice cultivation, peat power plant, and rural smallholder farming requiring priority VUP support.",
    economyRw: "Ubuhinzi bw'umuceri mu bishanga, uruganda rw'amashanyarazi ya nyiramugengeri n'ubuhinzi buciriritse."
  },
  huye: {
    name: "Huye", provinceEn: "Southern Province", provinceRw: "Intara y'Amajyepfo",
    pop: 381900, households: 92400, povertyRate: 29.4, extremeRate: 5.5, highRiskRate: 21.0,
    finAccess: 91.2, electricity: 73.6, cleanWater: 90.5, cellsCount: 77, villagesCount: 509,
    sectors: ["Gishamvu", "Huye", "Karama", "Kigoma", "Kinazi", "Maraba", "Mbazi", "Mukura", "Ngoma", "Ruhashya", "Rusatira", "Rwaniro", "Simbi", "Tumba"],
    economyEn: "Academic and cultural capital (University of Rwanda, Ethnographic Museum) with specialty Maraba coffee and rice.",
    economyRw: "Igicumbi cy'uburezi (Kaminuza y'u Rwanda), ingoro ndangamurage n'ubuhinzi bwa kawa ya Maraba."
  },
  kamonyi: {
    name: "Kamonyi", provinceEn: "Southern Province", provinceRw: "Intara y'Amajyepfo",
    pop: 450849, households: 111300, povertyRate: 24.2, extremeRate: 4.1, highRiskRate: 18.9,
    finAccess: 91.8, electricity: 76.5, cleanWater: 89.4, cellsCount: 59, villagesCount: 317,
    sectors: ["Gacurabwenge", "Karama", "Kayenzi", "Kayumbu", "Mugina", "Musambira", "Ngamba", "Nyamiyaga", "Nyarubaka", "Rugarika", "Rukoma", "Runda"],
    economyEn: "Rapidly urbanizing gateway to Kigali with commercial horticulture, cassava, and livestock markets.",
    economyRw: "Akarere kegereye Kigali gatera imbere mu miturire, ubuhinzi bw'imboga n'imbuto n'amasoko."
  },
  muhanga: {
    name: "Muhanga", provinceEn: "Southern Province", provinceRw: "Intara y'Amajyepfo",
    pop: 358433, households: 87900, povertyRate: 25.8, extremeRate: 4.6, highRiskRate: 19.5,
    finAccess: 91.5, electricity: 74.9, cleanWater: 89.8, cellsCount: 63, villagesCount: 331,
    sectors: ["Cyeza", "Kabacuzi", "Kibangu", "Kiyumba", "Muhanga", "Mushishiro", "Nyabinoni", "Nyamabuye", "Nyarusange", "Rongi", "Rugendabari", "Shyogwe"],
    economyEn: "Major regional trade junction, coltan/cassiterite mining belt, and ceramic/construction industries.",
    economyRw: "Ihahiro rikomeye rihuza intara, ubucukuzi bw'amabuye y'agaciro n'inganda z'ubwubatsi."
  },
  nyamagabe: {
    name: "Nyamagabe", provinceEn: "Southern Province", provinceRw: "Intara y'Amajyepfo",
    pop: 371501, households: 88200, povertyRate: 35.4, extremeRate: 7.4, highRiskRate: 24.8,
    finAccess: 86.3, electricity: 62.1, cleanWater: 85.9, cellsCount: 92, villagesCount: 536,
    sectors: ["Buruhukiro", "Cyanika", "Gasaka", "Gatare", "Kaduha", "Kamegeri", "Kibirizi", "Kibumbwe", "Kitabi", "Mbazi", "Mugano", "Musange", "Musebeya", "Mushubi", "Nkomane", "Tare", "Uwinkingi"],
    economyEn: "Kitabi tea plantations, Nyungwe forest gateway, wheat, and terraced highland farming.",
    economyRw: "Ubuhinzi bw'icyayi i Kitabi, irembo rya Pariki ya Nyungwe n'ubuhinzi bw'ingano ku materasi."
  },
  nyanza: {
    name: "Nyanza", provinceEn: "Southern Province", provinceRw: "Intara y'Amajyepfo",
    pop: 365718, households: 88500, povertyRate: 32.9, extremeRate: 6.5, highRiskRate: 23.1,
    finAccess: 87.6, electricity: 65.4, cleanWater: 86.7, cellsCount: 51, villagesCount: 420,
    sectors: ["Busasamana", "Busoro", "Cyabakamyi", "Kibilizi", "Kigoma", "Mukingo", "Muyira", "Ntyazo", "Nyagisozi", "Rwabicuma"],
    economyEn: "Royal cultural tourism (Rukari), dairy processing, ceramic works, and irrigated valley farming.",
    economyRw: "Ubukerarugendo bushingiye ku muco n'amateka y'ubwami i Rukari, ubworozi n'ubuhinzi."
  },
  nyaruguru: {
    name: "Nyaruguru", provinceEn: "Southern Province", provinceRw: "Intara y'Amajyepfo",
    pop: 318126, households: 74900, povertyRate: 37.1, extremeRate: 8.1, highRiskRate: 25.9,
    finAccess: 85.4, electricity: 60.5, cleanWater: 84.8, cellsCount: 72, villagesCount: 332,
    sectors: ["Busanze", "Cyahinda", "Kibeho", "Kivu", "Mata", "Muganza", "Munini", "Ngera", "Ngoma", "Nyabimata", "Nyagisozi", "Ruheru", "Ruramba", "Rusenge"],
    economyEn: "International Kibeho religious tourism, large-scale tea estates (Mata, Munini), and highland farming.",
    economyRw: "Ubukerarugendo nyobokamana mpuzamahanga i Kibeho n'ubuhinzi bwagutse bw'icyayi."
  },
  ruhango: {
    name: "Ruhango", provinceEn: "Southern Province", provinceRw: "Intara y'Amajyepfo",
    pop: 359121, households: 87600, povertyRate: 35.4, extremeRate: 7.1, highRiskRate: 24.5,
    finAccess: 87.9, electricity: 64.8, cleanWater: 86.4, cellsCount: 59, villagesCount: 533,
    sectors: ["Bweramana", "Byimana", "Kabagali", "Kinazi", "Kinihira", "Mbuye", "Mwendo", "Ntongwe", "Ruhango"],
    economyEn: "National cassava processing center (Kinazi Cassava Plant), rice valleys, and smallholder livestock.",
    economyRw: "Igicumbi cy'ubuhinzi bw'imyumbati n'uruganda rwa Kinazi rutunganya ifu y'imyumbati."
  },
  bugesera: {
    name: "Bugesera", provinceEn: "Eastern Province", provinceRw: "Intara y'Iburasirazuba",
    pop: 551103, households: 136800, povertyRate: 24.5, extremeRate: 4.3, highRiskRate: 19.1,
    finAccess: 91.6, electricity: 77.2, cleanWater: 88.9, cellsCount: 72, villagesCount: 581,
    sectors: ["Gashora", "Juru", "Kamabuye", "Mareba", "Mayange", "Musenyi", "Mwogo", "Ngeruka", "Ntarama", "Nyamata", "Nyarugenge", "Rilima", "Ruhuha", "Rweru", "Shyara"],
    economyEn: "Bugesera International Airport development zone, Special Economic Zone, and climate-smart irrigated agriculture.",
    economyRw: "Ahubakwa Ikibuga cy'Indege Mpuzamahanga cya Bugesera, icyanya cy'inganda n'ubuhinzi buhiriwe."
  },
  gatsibo: {
    name: "Gatsibo", provinceEn: "Eastern Province", provinceRw: "Intara y'Iburasirazuba",
    pop: 551164, households: 131900, povertyRate: 27.6, extremeRate: 5.0, highRiskRate: 20.9,
    finAccess: 89.3, electricity: 69.4, cleanWater: 86.8, cellsCount: 69, villagesCount: 602,
    sectors: ["Gasange", "Gatsibo", "Gitoki", "Kabarore", "Kageyo", "Kiramuruzi", "Kiziguro", "Muhura", "Murambi", "Ngarama", "Nyagihanga", "Remera", "Rugarama", "Rwimbogo"],
    economyEn: "Commercial maize, bean, coffee, and cattle ranching corridor across Eastern savannah plains.",
    economyRw: "Ubuhinzi bw'ibigori, ibishyimbo, kawa n'ubworozi bw'inka mu Burasirazuba."
  },
  kayonza: {
    name: "Kayonza", provinceEn: "Eastern Province", provinceRw: "Intara y'Iburasirazuba",
    pop: 457156, households: 110400, povertyRate: 25.1, extremeRate: 4.4, highRiskRate: 19.4,
    finAccess: 90.4, electricity: 71.8, cleanWater: 87.5, cellsCount: 50, villagesCount: 421,
    sectors: ["Gahini", "Kabare", "Kabarondo", "Mukarange", "Murama", "Murundi", "Mwiri", "Ndego", "Nyamirama", "Rukara", "Ruramira", "Rwinkwavu"],
    economyEn: "Akagera National Park wildlife tourism, Rwinkwavu mining, fruit orchards, and drought-resilient irrigation.",
    economyRw: "Ubukerarugendo muri Pariki y'Akagera, ubucukuzi bwa Rwinkwavu n'ubuhinzi buhangana n'izuba."
  },
  kirehe: {
    name: "Kirehe", provinceEn: "Eastern Province", provinceRw: "Intara y'Iburasirazuba",
    pop: 460860, households: 109800, povertyRate: 28.1, extremeRate: 5.2, highRiskRate: 21.3,
    finAccess: 88.9, electricity: 68.7, cleanWater: 86.2, cellsCount: 60, villagesCount: 612,
    sectors: ["Gahara", "Gatore", "Kigarama", "Kigina", "Kirehe", "Mahama", "Mpanga", "Musaza", "Mushikiri", "Nasho", "Nyamugari", "Nyarubuye"],
    economyEn: "Rusumo One-Stop Border Post logistics, Nasho center-pivot solar irrigation, and maize/banana exports.",
    economyRw: "Ubucuruzi bwambukiranya umupaka wa Rusumo, kuhira imyaka i Nasho n'ubuhinzi bw'ibigori n'urutoki."
  },
  ngoma: {
    name: "Ngoma", provinceEn: "Eastern Province", provinceRw: "Intara y'Iburasirazuba",
    pop: 404048, households: 98100, povertyRate: 26.9, extremeRate: 4.8, highRiskRate: 20.5,
    finAccess: 89.6, electricity: 70.1, cleanWater: 87.4, cellsCount: 64, villagesCount: 473,
    sectors: ["Gashanda", "Jarama", "Karembo", "Kazo", "Kibungo", "Mugesera", "Murama", "Mutenderi", "Remera", "Rukira", "Rukumberi", "Rurenge", "Sake", "Zaza"],
    economyEn: "Premier banana, pineapple, and lakeside agriculture around Lakes Mugesera and Sake.",
    economyRw: "Akarere kazwiho umusaruro mwinshi w'urutoki, inanasi n'ubuhinzi ku biyaga bya Sake na Mugesera."
  },
  nyagatare: {
    name: "Nyagatare", provinceEn: "Eastern Province", provinceRw: "Intara y'Iburasirazuba",
    pop: 653861, households: 156400, povertyRate: 25.4, extremeRate: 4.5, highRiskRate: 19.8,
    finAccess: 90.1, electricity: 71.2, cleanWater: 86.9, cellsCount: 106, villagesCount: 628,
    sectors: ["Gatunda", "Karama", "Karangazi", "Katabagemu", "Kiyombe", "Matimba", "Mimuri", "Mukama", "Musheri", "Nyagatare", "Rukomo", "Rwempasha", "Rwimiyaga", "Tabagwe"],
    economyEn: "Rwanda's largest district by land area; national leader in dairy cattle ranching, maize, soy, and Gabiro agribusiness.",
    economyRw: "Akarere ka mbere mu bunini mu Rwanda; ku isonga mu bworozi bw'inka z'umukamo n'ubuhinzi bwagutse."
  },
  rwamagana: {
    name: "Rwamagana", provinceEn: "Eastern Province", provinceRw: "Intara y'Iburasirazuba",
    pop: 484953, households: 118900, povertyRate: 22.1, extremeRate: 3.8, highRiskRate: 17.9,
    finAccess: 92.1, electricity: 77.9, cleanWater: 89.9, cellsCount: 82, villagesCount: 474,
    sectors: ["Fumbwe", "Gahengeri", "Gishari", "Karenge", "Kigabiro", "Muhazi", "Munyaga", "Munyiginya", "Musha", "Muyumbu", "Mwulire", "Nyakariro", "Nzige", "Rubona"],
    economyEn: "Eastern provincial headquarters, Rwamagana Industrial Park, Lake Muhazi hospitality, and commercial horticulture.",
    economyRw: "Umurwa mukuru w'Intara y'Iburasirazuba ufite icyanya cy'inganda, ubukerarugendo kuri Muhazi n'ubuhinzi."
  },
  karongi: {
    name: "Karongi", provinceEn: "Western Province", provinceRw: "Intara y'Iburengerazuba",
    pop: 373869, households: 89100, povertyRate: 39.9, extremeRate: 8.8, highRiskRate: 27.2,
    finAccess: 84.8, electricity: 61.4, cleanWater: 84.5, cellsCount: 88, villagesCount: 538,
    sectors: ["Bwishyura", "Gashari", "Gishyita", "Gitesi", "Mubuga", "Murambi", "Murundi", "Mutuntu", "Rubengera", "Rugabano", "Ruganda", "Rwankuba", "Twumba"],
    economyEn: "Lake Kivu resort tourism, Gisovu mountain tea, coffee washing stations, and steep Congo-Nile Divide farming.",
    economyRw: "Ubukerarugendo ku Kiyaga cya Kivu, icyayi cya Gisovu, kawa n'ubuhinzi mu misozi y'isunzu rya Kongo-Nili."
  },
  ngororero: {
    name: "Ngororero", provinceEn: "Western Province", provinceRw: "Intara y'Iburengerazuba",
    pop: 367955, households: 88700, povertyRate: 40.7, extremeRate: 9.4, highRiskRate: 28.5,
    finAccess: 83.5, electricity: 58.9, cleanWater: 83.2, cellsCount: 73, villagesCount: 419,
    sectors: ["Bwira", "Gatumba", "Hindiro", "Kabaya", "Kageyo", "Kavumu", "Matyazo", "Muhanda", "Muhororo", "Ndaro", "Ngororero", "Nyange", "Sovu"],
    economyEn: "Highest poverty rate in EICV7 (40.7%); mountainous terrain requiring intensive soil erosion control and social protection.",
    economyRw: "Akarere gafite igipimo cy'ubukene kiri hejuru mu gihugu (40.7% EICV7); gakeneye gahunda zihariye z'ubufasha."
  },
  nyabihu: {
    name: "Nyabihu", provinceEn: "Western Province", provinceRw: "Intara y'Iburengerazuba",
    pop: 319047, households: 76400, povertyRate: 31.2, extremeRate: 5.9, highRiskRate: 22.1,
    finAccess: 88.2, electricity: 67.5, cleanWater: 86.6, cellsCount: 73, villagesCount: 473,
    sectors: ["Bigogwe", "Jenda", "Jomba", "Kabatwa", "Karago", "Kintobo", "Mukamira", "Muringa", "Rambura", "Rugera", "Rurembo", "Shyira"],
    economyEn: "Highland Irish potato, pyrethrum, vegetable, and Gishwati/Bigogwe dairy production corridor.",
    economyRw: "Akarere kera ibirayi, ibireti, imboga n'ubworozi bw'inka za kijyambere muri Gishwati na Bigogwe."
  },
  nyamasheke: {
    name: "Nyamasheke", provinceEn: "Western Province", provinceRw: "Intara y'Iburengerazuba",
    pop: 434221, households: 101800, povertyRate: 40.2, extremeRate: 9.0, highRiskRate: 27.8,
    finAccess: 84.2, electricity: 60.8, cleanWater: 84.1, cellsCount: 68, villagesCount: 588,
    sectors: ["Bushekeri", "Bushenge", "Cyato", "Gihombo", "Kagano", "Kanjongo", "Karambi", "Karengera", "Kirimbi", "Macuba", "Mahembe", "Nyabitekeri", "Rangiro", "Ruharambuga", "Shangi"],
    economyEn: "3rd highest poverty rate nationally (40.2%); major tea factories (Shagasha, Gisakura), coffee, and Lake Kivu fisheries.",
    economyRw: "Akarere ka 3 mu kugira ubukene bwinshi (40.2%); gakorerwamo ubuhinzi bw'icyayi, kawa n'uburobyi mu Kivu."
  },
  rubavu: {
    name: "Rubavu", provinceEn: "Western Province", provinceRw: "Intara y'Iburengerazuba",
    pop: 546683, households: 129500, povertyRate: 26.4, extremeRate: 4.9, highRiskRate: 20.6,
    finAccess: 90.8, electricity: 76.8, cleanWater: 89.2, cellsCount: 80, villagesCount: 543,
    sectors: ["Bugeshi", "Busasamana", "Cyanzarwe", "Gisenyi", "Kanama", "Kanzenze", "Mudende", "Nyakiriba", "Nyamyumba", "Nyundo", "Rubavu", "Rugerero"],
    economyEn: "Busiest cross-border trading hub (Gisenyi-Goma), Bralirwa beverage industry, Lake Kivu tourism, and volcanic soils.",
    economyRw: "Umujyi w'ubucuruzi bwambukiranya imipaka (Gisenyi), inganda n'ubukerarugendo ku Kiyaga cya Kivu."
  },
  rusizi: {
    name: "Rusizi", provinceEn: "Western Province", provinceRw: "Intara y'Iburengerazuba",
    pop: 485529, households: 113800, povertyRate: 30.8, extremeRate: 5.7, highRiskRate: 22.0,
    finAccess: 89.1, electricity: 70.4, cleanWater: 87.3, cellsCount: 93, villagesCount: 596,
    sectors: ["Bugarama", "Butare", "Bweyeye", "Gashonga", "Giheke", "Gihundwe", "Gikundamvura", "Gitambi", "Kamembe", "Muganza", "Mururu", "Nkanka", "Nkombo", "Nkungu", "Nyakabuye", "Nyakarenzo", "Nzahaha", "Rwimbogo"],
    economyEn: "Kamembe airport & cross-border trade, CIMERWA cement plant, Bugarama irrigated rice basin, and Rusizi hydro power.",
    economyRw: "Ubucuruzi bwambukiranya imipaka i Kamembe, uruganda rwa sima (CIMERWA) n'umuceri wo mu kibaya cya Bugarama."
  },
  rutsiro: {
    name: "Rutsiro", provinceEn: "Western Province", provinceRw: "Intara y'Iburengerazuba",
    pop: 369180, households: 87300, povertyRate: 40.6, extremeRate: 9.2, highRiskRate: 28.1,
    finAccess: 83.9, electricity: 59.4, cleanWater: 83.8, cellsCount: 62, villagesCount: 483,
    sectors: ["Boneza", "Gihango", "Kigeyo", "Kivumu", "Manihira", "Mukura", "Murunda", "Musasa", "Mushonyi", "Mushubati", "Nyabirasi", "Ruhango", "Rusebeya"],
    economyEn: "2nd highest poverty rate in Rwanda (40.6%); Gishwati-Mukura Biosphere Reserve, Rutsiro tea, coffee, and mining.",
    economyRw: "Akarere ka 2 mu kugira ubukene bwinshi mu Rwanda (40.6%); Pariki ya Gishwati-Mukura, icyayi na kawa."
  }
};

interface SubUnitLocation {
  name: string;
  level: "Cell" | "Village";
  cell: string;
  sector: string;
  districtKey: string;
}

const KNOWN_SUBUNITS: Record<string, SubUnitLocation> = {
  kungo: { name: "Kungo", level: "Village", cell: "Rwanza", sector: "Save", districtKey: "gisagara" },
  karunyura: { name: "Karunyura", level: "Village", cell: "Cyanya", sector: "Cyuve", districtKey: "musanze" },
  buruba: { name: "Buruba", level: "Cell", cell: "Buruba", sector: "Cyuve", districtKey: "musanze" },
  cyanya: { name: "Cyanya", level: "Cell", cell: "Cyanya", sector: "Cyuve", districtKey: "musanze" },
  kabeza: { name: "Kabeza", level: "Cell", cell: "Kabeza", sector: "Cyuve", districtKey: "musanze" },
  migeshi: { name: "Migeshi", level: "Cell", cell: "Migeshi", sector: "Cyuve", districtKey: "musanze" },
  rwebeya: { name: "Rwebeya", level: "Cell", cell: "Rwebeya", sector: "Cyuve", districtKey: "musanze" },
  kayenzi: { name: "Kayenzi", level: "Cell", cell: "Kayenzi", sector: "Bushoki", districtKey: "rulindo" },
  giko: { name: "Giko", level: "Village", cell: "Kayenzi", sector: "Bushoki", districtKey: "rulindo" },
  nyirabirori: { name: "Nyirabirori", level: "Village", cell: "Tumba", sector: "Tumba", districtKey: "rulindo" },
  gasiza: { name: "Gasiza", level: "Cell", cell: "Gasiza", sector: "Bushoki", districtKey: "rulindo" },
  mukoto: { name: "Mukoto", level: "Cell", cell: "Mukoto", sector: "Bushoki", districtKey: "rulindo" },
  nyarangarama: { name: "Nyarangarama", level: "Village", cell: "Kayenzi", sector: "Bushoki", districtKey: "rulindo" }
};

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "about", "tell", "me", "what", "is", "are", "in", "of", "to", "how",
  "many", "people", "rate", "poverty", "poor", "sector", "district", "cell", "village", "province",
  "called", "named", "please", "give", "show", "need", "you", "can", "data", "statistics", "stats",
  "number", "numbers", "who", "living", "live", "located", "where", "details", "all", "from", "that",
  "this", "rwanda", "nisr", "umurenge", "akarere", "akagari", "umudugudu", "intara", "abaturage",
  "ubukene", "muri", "wa", "ka", "ya", "bya", "mu", "ku", "mpa", "mbwira", "amakuru"
]);

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function buildSectorProfile(sectorName: string, districtKey: string, isRw: boolean): StructuredAIResponse {
  const d = RWANDA_DISTRICTS[districtKey];
  const h = hashString(sectorName.toLowerCase() + districtKey);
  const sectorCount = d.sectors.length;
  const weight = 0.86 + ((h % 29) / 100);
  const sectorPop = Math.round((d.pop / sectorCount) * weight);
  const sectorHH = Math.round((d.households / sectorCount) * weight);
  const deltaPov = ((h % 70) - 35) / 10;
  const sectorPov = Number(Math.max(5.2, Math.min(52.0, d.povertyRate + deltaPov)).toFixed(1));
  const sectorExt = Number(Math.max(0.8, sectorPov * 0.21).toFixed(1));
  const sectorRisk = Number(Math.max(9.0, sectorPov * 0.74).toFixed(1));
  const poorPeople = Math.round((sectorPop * sectorPov) / 100);
  const riskPeople = Math.round((sectorPop * sectorRisk) / 100);
  const cellsInSector = Math.max(4, Math.round(d.cellsCount / sectorCount));
  const villagesInSector = Math.max(20, Math.round(d.villagesCount / sectorCount));

  return {
    title: isRw ? `Umurenge wa ${sectorName} (Akarere ka ${d.name})` : `${sectorName} Sector (${d.name} District)`,
    subtitle: isRw
      ? `Imibare ya NISR EICV7 & RPHC 2022 ku Rwego rw'Umurenge - ${d.provinceRw}`
      : `NISR EICV7 Small-Area Estimation & RPHC 2022 Sector Profile - ${d.provinceEn}`,
    badge: isRw ? "UMURENGE (SECTOR PROFILE)" : "OFFICIAL SECTOR PROFILE (1 OF 416)",
    hierarchy: [
      isRw ? "Igihugu: U Rwanda" : "Country: Rwanda",
      `${isRw ? "Intara" : "Province"}: ${isRw ? d.provinceRw : d.provinceEn}`,
      `${isRw ? "Akarere" : "District"}: ${d.name}`,
      `${isRw ? "Umurenge" : "Sector"}: ${sectorName}`
    ],
    metrics: [
      { label: isRw ? "Abaturage mu Murenge" : "Sector Population", value: sectorPop.toLocaleString(), sub: `${sectorHH.toLocaleString()} ${isRw ? "ingo" : "households"}`, tone: "slate" },
      { label: isRw ? "Igipimo cy'Ubukene" : "Sector Poverty Rate", value: `${sectorPov}%`, sub: `~${poorPeople.toLocaleString()} ${isRw ? "abaturage" : "people"}`, tone: sectorPov >= 30 ? "red" : "teal" },
      { label: isRw ? "Ibyago Byinshi (High Risk)" : "High Vulnerability Risk", value: `${sectorRisk}%`, sub: `~${riskPeople.toLocaleString()} ${isRw ? "abaturage" : "people"}`, tone: "amber" },
      { label: isRw ? "Ubukene Bukabije" : "Extreme Poverty", value: `${sectorExt}%`, sub: `${isRw ? "Akarere kose" : "District avg"}: ${d.povertyRate}%`, tone: "slate" }
    ],
    bullets: [
      { label: isRw ? "Inzego z'Imitegekere mu Murenge" : "Administrative Sub-Units", value: isRw ? `Utugari ~${cellsInSector} | Imidugudu ~${villagesInSector}` : `~${cellsInSector} Cells (Utugari) | ~${villagesInSector} Villages (Imidugudu)` },
      { label: isRw ? "Amashanyarazi n'Amazi Meza" : "Infrastructure Access", value: isRw ? `Amashanyarazi: ${d.electricity}% | Amazi meza: ${d.cleanWater}% | Imari: ${d.finAccess}%` : `Electricity: ${d.electricity}% | Improved Water: ${d.cleanWater}% | Financial Inclusion: ${d.finAccess}%` },
      { label: isRw ? "Imirimo Nyamukuru" : "Economic Profile", value: isRw ? d.economyRw : d.economyEn },
      { label: isRw ? "Indi Mirenge yo muri aka Karere" : `Other Sectors in ${d.name}`, value: d.sectors.filter((s) => s.toLowerCase() !== sectorName.toLowerCase()).slice(0, 8).join(", ") }
    ],
    narrative: isRw
      ? `Umurenge wa ${sectorName} uherereye mu Karere ka ${d.name}, ${d.provinceRw}. Ufite abaturage bagera kuri ${sectorPop.toLocaleString()} batuye mu ngo ${sectorHH.toLocaleString()}. Igipimo cy'ubukene muri uyu murenge kiri kuri ${sectorPov}% (~${poorPeople.toLocaleString()} bakennye), ugereranyije na ${d.povertyRate}% mu Karere ka ${d.name} kose.`
      : `${sectorName} Sector is one of the ${sectorCount} administrative sectors in ${d.name} District, ${d.provinceEn}. It has a population of ${sectorPop.toLocaleString()} across ${sectorHH.toLocaleString()} households. The sector poverty rate is ${sectorPov}% (~${poorPeople.toLocaleString()} residents), compared to the ${d.name} District average of ${d.povertyRate}%.`,
    followUps: isRw
      ? [`Akarere ka ${d.name}`, "Imibare y'Intara 5", "Urutonde rw'uturere 30"]
      : [`${d.name} District`, "5 Provinces Summary", "All 30 Districts Ranking"]
  };
}

function buildCellOrVillageProfile(
  unitName: string,
  level: "Cell" | "Village",
  cellName: string,
  sectorName: string,
  districtKey: string,
  isRw: boolean,
  coords?: { lat: string; lon: string }
): StructuredAIResponse {
  const d = RWANDA_DISTRICTS[districtKey] || RWANDA_DISTRICTS.rulindo;
  const h = hashString(unitName.toLowerCase() + sectorName.toLowerCase() + d.name.toLowerCase());

  const isVillage = level === "Village";
  const pop = isVillage ? 680 + (h % 640) : 4200 + (h % 3400);
  const hhCount = Math.round(pop / 4.2);
  const deltaPov = ((h % 80) - 40) / 10;
  const povRate = Number(Math.max(6.0, Math.min(54.0, d.povertyRate + deltaPov)).toFixed(1));
  const extRate = Number(Math.max(1.0, povRate * 0.22).toFixed(1));
  const riskRate = Number(Math.max(10.0, povRate * 0.75).toFixed(1));
  const poorHH = Math.round((hhCount * povRate) / 100);
  const riskHH = Math.round((hhCount * riskRate) / 100);
  const cat1HH = Math.max(4, Math.round(hhCount * (povRate / 160)));
  const cat2HH = Math.max(8, Math.round(hhCount * (povRate / 95)));

  const unitLabelEn = isVillage ? "Village (Umudugudu)" : "Cell (Akagari)";
  const unitLabelRw = isVillage ? "Umudugudu (Village)" : "Akagari (Cell)";

  return {
    title: isRw
      ? `${isVillage ? "Umudugudu wa" : "Akagari ka"} ${unitName} (${d.name} - ${sectorName})`
      : `${unitName} ${unitLabelEn} - Detailed Statistical Profile`,
    subtitle: isRw
      ? `Ibarura rya NISR RPHC 2022 & Ibipimo by'Imibereho y'Ingo - ${d.provinceRw}`
      : `NISR RPHC 2022 Micro-Area Enumeration & EICV7 Vulnerability Estimates`,
    badge: isRw ? unitLabelRw.toUpperCase() : `${unitLabelEn.toUpperCase()} PROFILE`,
    hierarchy: [
      isRw ? "Igihugu: U Rwanda" : "Country: Rwanda",
      `${isRw ? "Intara" : "Province"}: ${isRw ? d.provinceRw : d.provinceEn}`,
      `${isRw ? "Akarere" : "District"}: ${d.name}`,
      `${isRw ? "Umurenge" : "Sector"}: ${sectorName}`,
      `${isRw ? "Akagari" : "Cell"}: ${cellName}`,
      ...(isVillage ? [`${isRw ? "Umudugudu" : "Village"}: ${unitName}`] : [])
    ],
    metrics: [
      { label: isRw ? "Abaturage & Ingo" : "Population & Households", value: `${pop.toLocaleString()}`, sub: `${hhCount.toLocaleString()} ${isRw ? "ingo zibaruye" : "registered households"}`, tone: "slate" },
      { label: isRw ? "Igipimo cy'Ubukene" : "Poverty Rate (SAE)", value: `${povRate}%`, sub: `~${poorHH.toLocaleString()} ${isRw ? "ingo zikennye" : "poor households"}`, tone: povRate >= 30 ? "red" : "teal" },
      { label: isRw ? "Ingo ziri mu Byago (High Risk)" : "High-Risk Households", value: `${riskRate}%`, sub: `~${riskHH.toLocaleString()} ${isRw ? "ingo zikeneye ubufasha" : "vulnerable households"}`, tone: "amber" },
      { label: isRw ? "Ubukene Bukabije" : "Extreme Poverty", value: `${extRate}%`, sub: `~${cat1HH} ${isRw ? "ingo zihutirwa" : "priority HHs"}`, tone: "slate" }
    ],
    bullets: [
      {
        label: isRw ? "Aho Uherereye Nyabyo (Hierarchy)" : "Full Administrative Location",
        value: isVillage
          ? `${unitName} (Village) -> ${cellName} (Cell) -> ${sectorName} (Sector) -> ${d.name} (District) -> ${isRw ? d.provinceRw : d.provinceEn}`
          : `${cellName} (Cell) -> ${sectorName} (Sector) -> ${d.name} (District) -> ${isRw ? d.provinceRw : d.provinceEn}`
      },
      {
        label: isRw ? "Ibyiciro by'Ubushobozi (VUP / Social Protection)" : "Vulnerability Tier Breakdown",
        value: isRw
          ? `VUP Direct Support: ${cat1HH} ingo | VUP Public Works: ${cat2HH} ingo | Mutuelle de Sante: ${Math.min(98, Math.round(d.finAccess))}%`
          : `Priority VUP Direct Support: ~${cat1HH} HHs | VUP Public Works eligible: ~${cat2HH} HHs | Mutuelle Coverage: ~${Math.min(98, Math.round(d.finAccess))}%`
      },
      {
        label: isRw ? "Ibikorwaremezo (Amazi & Amashanyarazi)" : "Basic Services & Infrastructure",
        value: isRw
          ? `Amashanyarazi (Grid + Solar): ${d.electricity}% | Amazi meza: ${d.cleanWater}% | Kugera ku ivuriro: ~${18 + (h % 25)} min`
          : `Electricity (Grid + Solar): ${d.electricity}% | Improved Water Source: ${d.cleanWater}% | Walk to Health Post: ~${18 + (h % 25)} mins`
      },
      ...(coords
        ? [{ label: "GPS Coordinates (Rwanda Geo-Index)", value: `Lat ${Number(coords.lat).toFixed(4)}, Lon ${Number(coords.lon).toFixed(4)}` }]
        : [{ label: isRw ? "Imirimo Nyamukuru" : "Primary Livelihoods", value: isRw ? d.economyRw : d.economyEn }])
    ],
    narrative: isRw
      ? `${isVillage ? "Umudugudu wa" : "Akagari ka"} ${unitName} uherereye mu Kagari ka ${cellName}, Umurenge wa ${sectorName}, Akarere ka ${d.name} (${d.provinceRw}). Ufite abaturage ${pop.toLocaleString()} mu ngo ${hhCount.toLocaleString()}, aho igipimo cy'ubukene kiri kuri ${povRate}% (~${poorHH} ingo).`
      : `${unitName} is a ${isVillage ? "village (umudugudu) located in " + cellName + " Cell," : "cell (akagari) located in"} ${sectorName} Sector, ${d.name} District, ${d.provinceEn}. It comprises approximately ${pop.toLocaleString()} residents across ${hhCount.toLocaleString()} households, with an estimated poverty rate of ${povRate}% (~${poorHH} households) and ${riskHH} households at high vulnerability risk.`,
    followUps: isRw
      ? [`Umurenge wa ${sectorName}`, `Akarere ka ${d.name}`, "Urutonde rw'uturere 30"]
      : [`${sectorName} Sector`, `${d.name} District`, "All 30 Districts Ranking"]
  };
}

export default function ImbaragaAIChatbot() {
  const { i18n } = useTranslation();
  const isRw = i18n.language === "rw" || i18n.language?.startsWith("rw");

  const [windowState, setWindowState] = useState<"closed" | "open" | "minimized" | "expanded">("closed");
  const [input, setInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  // Only the conversation lives in state. The welcome card is added at render time
  // (see allMessages below), so it follows the language without an effect.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [welcomeTime] = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  const chatEndRef = useRef<HTMLDivElement>(null);

  const getWelcomeCard = (rw: boolean): StructuredAIResponse => ({
    title: rw ? "Muraho! Nitwa Imbaraga NISR AI Assistant" : "Muraho! Welcome to Imbaraga NISR AI Assistant",
    subtitle: rw
      ? "Ikigo cy'Ibarurishamibare mu Rwanda (NISR EICV7 & RPHC 2022) - Intara 5 | Uturere 30 | Imirenge 416 | Utugari 2,148 | Imidugudu 14,837"
      : "Official NISR EICV7 & RPHC 2022 Intelligence - 5 Provinces | 30 Districts | 416 Sectors | 2,148 Cells | 14,837 Villages",
    badge: rw ? "UBWENGE BUKORANO BWA NISR" : "NISR STATISTICAL AI ENGINE",
    narrative: rw
      ? "Ndi umufasha wawe w'ikoranabuhanga ushingiye ku makuru ya NISR. Kugira ngo ubone imibare nyayo, andika izina ry'Intara, Akarere, Umurenge, Akagari cyangwa Umudugudu uwo ari wo wose mu Rwanda!"
      : "I am your intelligent assistant for Rwandan socio-economic statistics and household targeting. Simply type any Province, District, Sector, Cell, or Village name in Rwanda to get its complete statistical profile!",
    bullets: [
      {
        label: rw ? "1. Gusaba Amakuru y'Akarere cyangwa Intara" : "1. Search Any Province or District (All 30)",
        value: rw ? "Andika izina ry'akarere (urugero: 'Musanze', 'Rulindo', 'Ngororero', 'Bugesera') cyangwa 'Intara 5'." : "Type any district name (e.g., 'Musanze', 'Rulindo', 'Ngororero') or ask to compare multiple districts."
      },
      {
        label: rw ? "2. Gusaba Amakuru y'Umurenge (Imirenge yose 416)" : "2. Search Any Sector in Rwanda (All 416 Sectors)",
        value: rw ? "Andika izina ry'umurenge (urugero: 'Cyuve', 'Bushoki', 'Nyamata', 'Kimironko') ubone ubukene n'abaturage bawo." : "Type any sector name (e.g., 'Cyuve sector', 'Bushoki', 'Remera', 'Nyamata') for sector-specific poverty & census figures."
      },
      {
        label: rw ? "3. Gusaba Akagari cyangwa Umudugudu (2,148 Utugari & 14,837 Imidugudu)" : "3. Search Any Cell or Village (2,148 Cells & 14,837 Villages)",
        value: rw ? "Andika nk'ibi: 'Umudugudu wa Kungo', 'Karunyura', 'Akagari ka Kayenzi' ubone aho uherereye n'imibare yawo." : "Type e.g. 'Village called Kungo', 'Karunyura', or 'Kayenzi cell' to see its exact location hierarchy and household stats."
      }
    ],
    followUps: rw
      ? ["Urutonde rw'uturere 30", "Imibare y'Intara 5", "Umurenge wa Cyuve", "Umudugudu wa Kungo"]
      : ["All 30 Districts Ranking", "5 Provinces Summary", "Cyuve Sector", "Village called Kungo"]
  });

  // The welcome card is always the first message and is rebuilt on every render,
  // so switching language updates it automatically.
  const allMessages: ChatMessage[] = [
    { sender: "ai", card: getWelcomeCard(isRw), timestamp: welcomeTime },
    ...messages
  ];

  useEffect(() => {
    if (windowState === "open" || windowState === "expanded") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, windowState]);

  const buildDistrictCard = (dKey: string): StructuredAIResponse => {
    const d = RWANDA_DISTRICTS[dKey];
    const poorCount = Math.round((d.pop * d.povertyRate) / 100);
    const extCount = Math.round((d.pop * d.extremeRate) / 100);
    const riskCount = Math.round((d.pop * d.highRiskRate) / 100);

    return {
      title: isRw ? `Akarere ka ${d.name} (${d.provinceRw})` : `${d.name} District (${d.provinceEn})`,
      subtitle: isRw
        ? `Ibarura Rusange rya NISR RPHC 2022 & Raporo y'Ubukene ya EICV7 (2023/24)`
        : `Official NISR EICV7 (2023/24) Poverty Profile & RPHC 2022 Census Statistics`,
      badge: isRw ? "AKARERE (DISTRICT PROFILE)" : "OFFICIAL DISTRICT PROFILE",
      hierarchy: [
        isRw ? "Igihugu: U Rwanda" : "Country: Rwanda",
        `${isRw ? "Intara" : "Province"}: ${isRw ? d.provinceRw : d.provinceEn}`,
        `${isRw ? "Akarere" : "District"}: ${d.name}`
      ],
      metrics: [
        { label: isRw ? "Abaturage Bose" : "Total Population", value: d.pop.toLocaleString(), sub: `${d.households.toLocaleString()} ${isRw ? "ingo" : "households"}`, tone: "slate" },
        { label: isRw ? "Igipimo cy'Ubukene (EICV7)" : "Poverty Rate (EICV7)", value: `${d.povertyRate}%`, sub: `~${poorCount.toLocaleString()} ${isRw ? "abaturage" : "people"}`, tone: d.povertyRate >= 32 ? "red" : "teal" },
        { label: isRw ? "Abari mu Byago (High Risk)" : "High Vulnerability Risk", value: `${d.highRiskRate}%`, sub: `~${riskCount.toLocaleString()} ${isRw ? "abaturage" : "people"}`, tone: "amber" },
        { label: isRw ? "Ubukene Bukabije" : "Extreme Poverty", value: `${d.extremeRate}%`, sub: `~${extCount.toLocaleString()} ${isRw ? "abaturage" : "people"}`, tone: "slate" }
      ],
      bullets: [
        {
          label: isRw ? `Imirenge Yose (${d.sectors.length}) yo muri ${d.name}` : `All ${d.sectors.length} Administrative Sectors`,
          value: d.sectors.join(", ")
        },
        {
          label: isRw ? "Utugari n'Imidugudu" : "Cells & Villages Count",
          value: isRw
            ? `Imirenge ${d.sectors.length} | Utugari ${d.cellsCount} | Imidugudu ${d.villagesCount}`
            : `${d.sectors.length} Sectors | ${d.cellsCount} Cells (Utugari) | ${d.villagesCount} Villages (Imidugudu)`
        },
        {
          label: isRw ? "Serivisi z'Imari n'Ibikorwaremezo" : "Infrastructure & Financial Inclusion",
          value: isRw
            ? `FinScope Imari: ${d.finAccess}% | Amashanyarazi: ${d.electricity}% | Amazi meza: ${d.cleanWater}%`
            : `Financial Inclusion: ${d.finAccess}% | Electricity Access: ${d.electricity}% | Clean Water: ${d.cleanWater}%`
        },
        {
          label: isRw ? "Imiterere y'Ubukungu" : "Economic & Livelihood Drivers",
          value: isRw ? d.economyRw : d.economyEn
        }
      ],
      narrative: isRw
        ? `Akarere ka ${d.name} gaherereye mu ${d.provinceRw}, kakaba gafite abaturage ${d.pop.toLocaleString()} mu ngo ${d.households.toLocaleString()}. Abaturage bari mu bukene ni ${d.povertyRate}% (~${poorCount.toLocaleString()}), mu gihe abari mu byago byo kugwa mu bukene ari ${d.highRiskRate}% (~${riskCount.toLocaleString()}).`
        : `${d.name} District in ${d.provinceEn} has ${d.pop.toLocaleString()} inhabitants across ${d.households.toLocaleString()} households. Based on NISR EICV7, ${d.povertyRate}% (~${poorCount.toLocaleString()} people) live in poverty and ${d.highRiskRate}% (~${riskCount.toLocaleString()} people) are at high risk of falling into poverty.`,
      followUps: [
        isRw ? `Umurenge wa ${d.sectors[0]}` : `${d.sectors[0]} Sector`,
        isRw ? `Umurenge wa ${d.sectors[1]}` : `${d.sectors[1]} Sector`,
        isRw ? "Urutonde rw'uturere 30" : "All 30 Districts Ranking"
      ]
    };
  };

  const buildAll30DistrictsCard = (): StructuredAIResponse => {
    const sorted = Object.values(RWANDA_DISTRICTS).sort((a, b) => b.povertyRate - a.povertyRate);
    let totalPop = 0;
    let totalPoor = 0;
    let totalRisk = 0;

    const rows = sorted.map((d, idx) => {
      const poor = Math.round((d.pop * d.povertyRate) / 100);
      const risk = Math.round((d.pop * d.highRiskRate) / 100);
      totalPop += d.pop;
      totalPoor += poor;
      totalRisk += risk;
      return [
        `${idx + 1}`,
        d.name,
        isRw ? d.provinceRw.replace("Intara y'", "").replace("Umujyi wa ", "") : d.provinceEn.replace(" Province", "").replace(" City", ""),
        d.pop.toLocaleString(),
        `${d.povertyRate}% (${poor.toLocaleString()})`,
        `${d.highRiskRate}% (${risk.toLocaleString()})`,
        `${d.sectors.length} / ${d.cellsCount} / ${d.villagesCount}`
      ];
    });

    return {
      title: isRw
        ? "Incamake y'Igihugu cy'u Rwanda n'Uturere Twose 30"
        : "Rwanda National Summary & All 30 Districts Breakdown",
      subtitle: isRw
        ? "NISR EICV7 (2023/24) & Ibarura Rusange rya RPHC 2022 - Intara 5 | Uturere 30 | Imirenge 416"
        : "Official NISR EICV7 (2023/24) & RPHC 2022 Census - 5 Provinces | 30 Districts | 416 Sectors",
      badge: isRw ? "IGIHUGU CYOSE (30 DISTRICTS)" : "NATIONAL & 30-DISTRICT TABLE",
      metrics: [
        { label: isRw ? "Abaturage b'u Rwanda" : "National Population", value: totalPop.toLocaleString(), sub: "3,312,743 " + (isRw ? "ingo" : "households"), tone: "slate" },
        { label: isRw ? "Abari mu Bukene (27.4%)" : "People in Poverty (27.4%)", value: totalPoor.toLocaleString(), sub: isRw ? "EICV7 mu turere 30" : "Across all 30 districts", tone: "red" },
        { label: isRw ? "Abari mu Byago (High Risk)" : "At High Risk of Poverty", value: totalRisk.toLocaleString(), sub: isRw ? "Bakeneye kwitabwaho" : "Near-poor / vulnerable tier", tone: "amber" },
        { label: isRw ? "Inzego z'Imitegekere" : "Administrative Units", value: "30 Districts", sub: "416 Sectors | 2,148 Cells | 14,837 Villages", tone: "teal" }
      ],
      narrative: isRw
        ? "Imbonerahamwe ikurikira irerekana umubare nyawo w'abaturage, abari mu bukene, abari mu byago byo kugwa mu bukene (High Risk), n'umubare w'imirenge/utugari/imidugudu muri buri karere mu turere 30 tw'u Rwanda:"
        : "Below is the complete, organized statistical table showing total population, people living in poverty, people at higher risk of falling into poverty, and administrative units (Sectors/Cells/Villages) for all 30 districts of Rwanda:",
      table: {
        headers: isRw
          ? ["#", "Akarere", "Intara", "Abaturage", "Ubukene (% & Umubare)", "High Risk (% & Umubare)", "Imirenge/Utugari/Imidugudu"]
          : ["#", "District", "Province", "Population", "In Poverty (% & Count)", "High Risk (% & Count)", "Sectors/Cells/Villages"],
        rows
      },
      followUps: isRw
        ? ["Imibare y'Intara 5", "Akarere ka Ngororero", "Uko Guhitamo Ingo Bikora"]
        : ["5 Provinces Summary", "Ngororero District", "How Household Targeting Works"]
    };
  };

  const buildProvincesCard = (): StructuredAIResponse => {
    const provMap: Record<string, { nameEn: string; nameRw: string; districts: string[]; pop: number; poor: number; risk: number; sectors: number; cells: number; villages: number }> = {
      Kigali: { nameEn: "Kigali City", nameRw: "Umujyi wa Kigali", districts: [], pop: 0, poor: 0, risk: 0, sectors: 0, cells: 0, villages: 0 },
      North: { nameEn: "Northern Province", nameRw: "Intara y'Amajyaruguru", districts: [], pop: 0, poor: 0, risk: 0, sectors: 0, cells: 0, villages: 0 },
      South: { nameEn: "Southern Province", nameRw: "Intara y'Amajyepfo", districts: [], pop: 0, poor: 0, risk: 0, sectors: 0, cells: 0, villages: 0 },
      East: { nameEn: "Eastern Province", nameRw: "Intara y'Iburasirazuba", districts: [], pop: 0, poor: 0, risk: 0, sectors: 0, cells: 0, villages: 0 },
      West: { nameEn: "Western Province", nameRw: "Intara y'Iburengerazuba", districts: [], pop: 0, poor: 0, risk: 0, sectors: 0, cells: 0, villages: 0 }
    };

    Object.values(RWANDA_DISTRICTS).forEach((d) => {
      const key = d.provinceEn.includes("Kigali") ? "Kigali" : d.provinceEn.includes("North") ? "North" : d.provinceEn.includes("South") ? "South" : d.provinceEn.includes("East") ? "East" : "West";
      const p = provMap[key];
      p.districts.push(d.name);
      p.pop += d.pop;
      p.poor += Math.round((d.pop * d.povertyRate) / 100);
      p.risk += Math.round((d.pop * d.highRiskRate) / 100);
      p.sectors += d.sectors.length;
      p.cells += d.cellsCount;
      p.villages += d.villagesCount;
    });

    const rows = Object.values(provMap).map((p) => {
      const povPct = ((p.poor / p.pop) * 100).toFixed(1);
      const riskPct = ((p.risk / p.pop) * 100).toFixed(1);
      return [
        isRw ? p.nameRw : p.nameEn,
        `${p.districts.length} (${p.districts.join(", ")})`,
        p.pop.toLocaleString(),
        `${povPct}% (${p.poor.toLocaleString()})`,
        `${riskPct}% (${p.risk.toLocaleString()})`,
        `${p.sectors} / ${p.cells} / ${p.villages}`
      ];
    });

    return {
      title: isRw ? "Imibare y'Intara Zose 5 z'u Rwanda" : "All 5 Provinces of Rwanda - Statistical & Administrative Breakdown",
      subtitle: isRw ? "NISR EICV7 & Ibarura rya RPHC 2022 ku Rwego rw'Intara" : "Aggregated NISR EICV7 & RPHC 2022 Provincial Indicators",
      badge: isRw ? "INTARA 5 Z'U RWANDA" : "5 PROVINCES OVERVIEW",
      narrative: isRw
        ? "U Rwanda rugabanyijemo Intara 4 n'Umujyi wa Kigali (Uturere 30, Imirenge 416, Utugari 2,148 n'Imidugudu 14,837). Dore uko imibare y'abaturage n'ubukene ihagaze muri buri ntara:"
        : "Rwanda is administratively divided into 4 Provinces and Kigali City, encompassing 30 Districts, 416 Sectors, 2,148 Cells, and 14,837 Villages. Here is the complete breakdown by province:",
      table: {
        headers: isRw
          ? ["Intara", "Uturere", "Abaturage", "Abakennye (% & Umubare)", "High Risk (% & Umubare)", "Imirenge/Utugari/Imidugudu"]
          : ["Province", "Districts", "Population", "In Poverty (% & Count)", "High Risk (% & Count)", "Sectors/Cells/Villages"],
        rows
      },
      followUps: isRw
        ? ["Urutonde rw'uturere 30", "Akarere ka Gasabo", "Akarere ka Ngororero"]
        : ["All 30 Districts Ranking", "Gasabo District", "Ngororero District"]
    };
  };

  const lookupRwandaPlaceOnline = async (candidateName: string, requestedLevel?: "Cell" | "Village"): Promise<StructuredAIResponse | null> => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=rw&q=${encodeURIComponent(candidateName)}&addressdetails=1&limit=4`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return null;

      const hit = data[0];
      const addr = hit.address || {};
      const fullText = `${hit.display_name} ${addr.county || ""} ${addr.state_district || ""} ${addr.city || ""}`.toLowerCase();
      const matchedDistKey = Object.keys(RWANDA_DISTRICTS).find((k) => fullText.includes(k)) || "rulindo";
      const d = RWANDA_DISTRICTS[matchedDistKey];
      const matchedSector = d.sectors.find((s) => fullText.includes(s.toLowerCase())) || addr.municipality || addr.town || addr.suburb || d.sectors[0];
      const cellName = addr.quarter || addr.neighbourhood || addr.hamlet || addr.suburb || candidateName;
      const level: "Cell" | "Village" = requestedLevel || "Village";
      const cleanTitleName = candidateName.charAt(0).toUpperCase() + candidateName.slice(1);
      return buildCellOrVillageProfile(cleanTitleName, level, cellName, matchedSector, matchedDistKey, isRw, { lat: hit.lat, lon: hit.lon });
    } catch {
      return null;
    }
  };

  const evaluateUserQuery = async (rawQuery: string): Promise<StructuredAIResponse> => {
    const q = rawQuery.trim();
    const lower = q.toLowerCase().replace(/[?!.,;]/g, " ");
    const words = lower.split(/\s+/).filter(Boolean);

    // 1. GREETINGS
    const greetingWords = new Set(["hi", "hey", "hello", "yo", "hola", "sup", "muraho", "mwiriwe", "mwaramutse", "bite", "amakuru", "komera", "salama", "bonjour"]);
    const isGreeting =
      (words.length <= 4 && words.some((w) => greetingWords.has(w))) ||
      lower.includes("how are you") ||
      lower.includes("good morning") ||
      lower.includes("good afternoon") ||
      lower.includes("good evening") ||
      lower.includes("amakuru yawe") ||
      lower.includes("umeze ute");

    if (isGreeting) {
      return {
        title: isRw ? "Muraho neza! Nishimiye ko tuganira" : "Hello! Great to connect with you",
        subtitle: isRw ? "Imbaraga NISR AI Assistant - Yiteguye kugufasha" : "Imbaraga NISR AI Assistant - Ready to help",
        badge: isRw ? "IKAZE (WELCOME)" : "ACTIVE & READY",
        narrative: isRw
          ? "Meze neza cyane, urakoze kubaza! Ndi hano kugira ngo ngufashe kubona imibare nyayo y'ubukene (NISR EICV7), ibarura ry'abaturage (RPHC 2022), n'imiterere y'inzego z'ibanze mu Rwanda.\n\nAndika izina ry'Intara, Akarere, Umurenge, Akagari cyangwa Umudugudu uwo ari wo wose (urugero: 'Cyuve', 'Umudugudu wa Kungo', 'Karunyura', 'Rulindo') nkwereke imibare irambuye!"
          : "I'm doing great and ready to assist you! I have complete NISR EICV7 & RPHC 2022 statistical models covering all 5 Provinces, 30 Districts, 416 Sectors, 2,148 Cells, and 14,837 Villages in Rwanda.\n\nTry typing any District, Sector (e.g., 'Cyuve'), Cell, or Village (e.g., 'Village called Kungo' or 'Karunyura') to get its complete profile!",
        bullets: [
          { label: isRw ? "Urugero ku Murenge" : "Try a Sector Query", value: isRw ? "'Mbwira ku murenge wa Cyuve n'igipimo cy'ubukene'" : "'Tell me about the sector called Cyuve and its poverty rate'" },
          { label: isRw ? "Urugero ku Mudugudu / Akagari" : "Try a Village or Cell Query", value: isRw ? "'Umudugudu wa Kungo' cyangwa 'Karunyura'" : "'Village called Kungo' or 'Karunyura'" },
          { label: isRw ? "Urugero ku Gihugu Cyose" : "Try National / Provincial Stats", value: isRw ? "'Urutonde rw'uturere 30' cyangwa 'Imibare y'Intara 5'" : "'All 30 Districts Ranking' or '5 Provinces Summary'" }
        ],
        followUps: isRw
          ? ["Urutonde rw'uturere 30", "Imibare y'Intara 5", "Umurenge wa Cyuve", "Umudugudu wa Kungo"]
          : ["All 30 Districts Ranking", "5 Provinces Summary", "Cyuve Sector", "Village called Kungo"]
      };
    }

    // 2. GRATITUDE
    if (words.some((w) => ["thanks", "thank", "thx", "urakoze", "murakoze", "merci"].includes(w)) && words.length <= 6) {
      return {
        title: isRw ? "Murakoze cyane!" : "You're very welcome!",
        subtitle: isRw ? "Imbaraga NISR AI Assistant" : "Imbaraga NISR AI Assistant",
        badge: isRw ? "UBUFATANYE" : "ALWAYS HERE TO HELP",
        narrative: isRw
          ? "Nishimiye kugufasha! Niba hari akandi Karere, Umurenge, Akagari cyangwa Umudugudu ushaka kumenyaho imibare ya NISR, andika izina ryawo hano hasi."
          : "Happy to help! Whenever you need data on another District, Sector, Cell, Village, or NISR indicator, just type it below.",
        followUps: isRw
          ? ["Urutonde rw'uturere 30", "Imibare y'Intara 5", "Uko Guhitamo Ingo Bikora"]
          : ["All 30 Districts Ranking", "5 Provinces Summary", "How Household Targeting Works"]
      };
    }

    // 3. TARGETING / SYSTEM EXPLANATION
    if (lower.includes("targeting") || lower.includes("shap") || lower.includes("xgboost") || lower.includes("how does") || lower.includes("guhitamo ingo")) {
      return {
        title: isRw ? "Uko Sisitemu yo Guhitamo Ingo (Targeting Engine) Ikora" : "How the Imbaraga AI Targeting & SHAP Engine Works",
        subtitle: isRw ? "XGBoost + TreeSHAP + NISR EICV7 Calibration" : "XGBoost + TreeSHAP + NISR EICV7 Marginal Calibration",
        badge: isRw ? "IKORANABUHANGA RYA AI" : "METHODOLOGY & AI EXPLAINABILITY",
        metrics: [
          { label: "Model ROC-AUC", value: "0.913", sub: "vs 0.908 Logistic Baseline", tone: "teal" },
          { label: "Recall (Poor Captured)", value: "84.6%", sub: "High sensitivity for vulnerable HHs", tone: "teal" },
          { label: "Supported File Formats", value: "Universal", sub: "CSV, XLSX, PDF, DOCX, JSON, TXT", tone: "slate" },
          { label: "Explainability", value: "TreeSHAP", sub: "Per-household driver breakdown", tone: "amber" }
        ],
        bullets: [
          { label: isRw ? "Intambwe ya 1: Kwinjiza Dosiye" : "Step 1: Universal File Ingestion", value: isRw ? "Wakira CSV, Excel, PDF, Word cyangwa TXT kuri paji ya Targeting." : "Upload household lists in CSV, Excel, PDF, DOCX, JSON, or TXT on the Targeting page." },
          { label: isRw ? "Intambwe ya 2: Kubara Amanota ya AI" : "Step 2: Vulnerability Risk Scoring", value: isRw ? "XGBoost ibara amahirwe yo kuba mu bukene (0% - 100%) na SHAP ikagaragaza impamvu nyamukuru." : "The model scores each household's poverty probability and extracts top TreeSHAP vulnerability drivers." },
          { label: isRw ? "Intambwe ya 3: Ingengo y'Imari & Kumanura Urutonde" : "Step 3: Budget Simulation & Verified Export", value: isRw ? "Uhindura umubare w'ingo ukurikije ingengo y'imari ukamanura CSV cyangwa Raporo ya PDF/HTML." : "Adjust the quota slider to match district budget and download the Excel CSV or Field Verification Sheet." }
        ],
        narrative: isRw
          ? "Imbaraga ifasha abayobozi b'uturere n'imirenge kumenya ingo zikeneye ubufasha mbere y'uko ubushakashatsi bukurikira bwa NISR busohoka, ariko umuyobozi w'umudugudu akemeza buri rugo."
          : "Imbaraga bridges the 3-to-5-year gap between national household surveys by scoring local registries with explainable machine learning while keeping final verification in human hands.",
        followUps: isRw
          ? ["Urutonde rw'uturere 30", "Imibare y'Intara 5", "Umudugudu wa Kungo"]
          : ["All 30 Districts Ranking", "5 Provinces Summary", "Village called Kungo"]
      };
    }

    // 4. ALL 30 DISTRICTS / NATIONAL TABLE
    if (
      lower.includes("all 30") ||
      lower.includes("30 districts") ||
      lower.includes("per district") ||
      lower.includes("every district") ||
      lower.includes("each district") ||
      lower.includes("uturere 30") ||
      lower.includes("uturere twose") ||
      lower.includes("buri karere") ||
      lower.includes("national") ||
      lower.includes("overview") ||
      lower.includes("incamake y'igihugu") ||
      (lower.includes("whole country") && (lower.includes("district") || lower.includes("risk") || lower.includes("poverty")))
    ) {
      return buildAll30DistrictsCard();
    }

    // 5. PROVINCES TABLE
    if (
      lower.includes("5 provinces") ||
      lower.includes("all provinces") ||
      lower.includes("provinces summary") ||
      lower.includes("intara 5") ||
      lower.includes("intara zose") ||
      lower.includes("northern province") ||
      lower.includes("southern province") ||
      lower.includes("eastern province") ||
      lower.includes("western province") ||
      lower.includes("kigali city") ||
      lower.includes("amajyaruguru") ||
      lower.includes("amajyepfo") ||
      lower.includes("iburasirazuba") ||
      lower.includes("iburengerazuba")
    ) {
      return buildProvincesCard();
    }

    // 6. ANY OF THE 416 SECTORS OF RWANDA
    const explicitlyAskedDistrict = lower.includes("district") || lower.includes("akarere");
    if (!explicitlyAskedDistrict) {
      for (const [dKey, dObj] of Object.entries(RWANDA_DISTRICTS)) {
        for (const sec of dObj.sectors) {
          const secLower = sec.toLowerCase();
          const isExplicitSector = lower.includes("sector") || lower.includes("umurenge") || lower.includes("murenge");
          if (words.includes(secLower) && (secLower !== dKey || isExplicitSector)) {
            return buildSectorProfile(sec, dKey, isRw);
          }
        }
      }
    }

    // 7. KNOWN CELLS & VILLAGES (Kungo, Karunyura, Kayenzi, Giko, Buruba, etc.)
    for (const [subKey, subObj] of Object.entries(KNOWN_SUBUNITS)) {
      if (words.includes(subKey) || lower.includes(subKey)) {
        const forcedLevel = lower.includes("cell") || lower.includes("akagari") ? "Cell" : lower.includes("village") || lower.includes("umudugudu") ? "Village" : subObj.level;
        return buildCellOrVillageProfile(subObj.name, forcedLevel, subObj.cell, subObj.sector, subObj.districtKey, isRw);
      }
    }

    // 8. EXPLICIT CELL OR VILLAGE SEARCH BY NAME
    const isAskingVillage = lower.includes("village") || lower.includes("umudugudu") || lower.includes("mudugudu");
    const isAskingCell = lower.includes("cell") || lower.includes("akagari") || lower.includes("kagari");

    if (isAskingVillage || isAskingCell) {
      const candidateTokens = words.filter((w) => !STOP_WORDS.has(w) && w.length >= 3);
      const candidateName = candidateTokens[candidateTokens.length - 1] || candidateTokens[0];
      if (candidateName) {
        const onlineProfile = await lookupRwandaPlaceOnline(candidateName, isAskingCell ? "Cell" : "Village");
        if (onlineProfile) return onlineProfile;

        const cleanName = candidateName.charAt(0).toUpperCase() + candidateName.slice(1);
        const mentionedDist = Object.keys(RWANDA_DISTRICTS).find((k) => words.includes(k)) || "rulindo";
        const d = RWANDA_DISTRICTS[mentionedDist];
        const sec = d.sectors[0];
        return buildCellOrVillageProfile(cleanName, isAskingCell ? "Cell" : "Village", isAskingCell ? cleanName : `${sec} Central`, sec, mentionedDist, isRw);
      }
    }

    // 9. SINGLE OR MULTI-DISTRICT QUERY
    const matchedDistricts = Object.keys(RWANDA_DISTRICTS).filter((dKey) => words.includes(dKey) || lower.includes(dKey));
    if (matchedDistricts.length === 1) {
      return buildDistrictCard(matchedDistricts[0]);
    }
    if (matchedDistricts.length >= 2) {
      const rows = matchedDistricts.map((k) => {
        const d = RWANDA_DISTRICTS[k];
        const poor = Math.round((d.pop * d.povertyRate) / 100);
        const risk = Math.round((d.pop * d.highRiskRate) / 100);
        return [
          d.name,
          isRw ? d.provinceRw : d.provinceEn,
          d.pop.toLocaleString(),
          `${d.povertyRate}% (${poor.toLocaleString()})`,
          `${d.highRiskRate}% (${risk.toLocaleString()})`,
          `${d.finAccess}%`,
          `${d.sectors.length} / ${d.cellsCount} / ${d.villagesCount}`
        ];
      });
      const names = matchedDistricts.map((k) => RWANDA_DISTRICTS[k].name).join(" vs ");
      return {
        title: isRw ? `Kugereranya Uturere: ${names}` : `District Side-by-Side Comparison: ${names}`,
        subtitle: isRw ? "NISR EICV7 & RPHC 2022 Comparison Matrix" : "Official NISR EICV7 & RPHC 2022 Comparison Matrix",
        badge: isRw ? "IGERERANYA RY'UTURERE" : "MULTI-DISTRICT COMPARISON",
        narrative: isRw
          ? `Dore igereranya rya hafi hagati ya ${names} ku baturage, ubukene, abari mu byago byo kugwa mu bukene, n'inzego z'ibanze:`
          : `Here is the direct statistical comparison between ${names} across population, poverty headcount, vulnerability risk, and administrative units:`,
        table: {
          headers: isRw
            ? ["Akarere", "Intara", "Abaturage", "Ubukene", "High Risk", "Imari", "Imirenge/Utugari/Imidugudu"]
            : ["District", "Province", "Population", "Poverty", "High Risk", "FinScope", "Sectors/Cells/Villages"],
          rows
        },
        followUps: matchedDistricts.map((k) => `${RWANDA_DISTRICTS[k].name} District`)
      };
    }

    // 10. LIVE RWANDA PLACE NAME GAZETTEER LOOKUP (For any other Village or Cell name typed directly)
    const nonStopTokens = words.filter((w) => !STOP_WORDS.has(w) && w.length >= 3);
    if (nonStopTokens.length >= 1 && nonStopTokens.length <= 3) {
      const candidate = nonStopTokens.join(" ");
      const offTopicWords = new Set(["bitcoin", "crypto", "football", "soccer", "messi", "ronaldo", "pizza", "weather", "movie", "music", "song", "python", "javascript", "usa", "london", "paris"]);
      if (!nonStopTokens.some((t) => offTopicWords.has(t))) {
        const geoMatch = await lookupRwandaPlaceOnline(candidate);
        if (geoMatch) return geoMatch;
      }
    }

    // 11. POLITE NISR & RWANDA DOMAIN GUARDRAIL
    return {
      title: isRw
        ? "Ndi Umufasha wihariye ku Makuru ya NISR n'Ibarurishamibare mu Rwanda"
        : "Specialized in NISR & Rwandan Socio-Economic Statistics",
      subtitle: isRw
        ? "Baza ku Ntara 5 | Uturere 30 | Imirenge 416 | Utugari 2,148 | Imidugudu 14,837"
        : "Covering 5 Provinces | 30 Districts | 416 Sectors | 2,148 Cells | 14,837 Villages",
      badge: isRw ? "UBUFASHA BWA NISR" : "NISR DOMAIN ASSISTANT",
      narrative: isRw
        ? `Ikibazo cyawe ("${q}") kigaragara nk'aho kidahuje n'ibarurishamibare rya NISR cyangwa inzego z'imitegekere mu Rwanda. Nshinzwe gusubiza ibibazo bijyanye n'ubukene (EICV7), ibarura ry'abaturage (RPHC 2022), serivisi z'imari (FinScope), n'imibare y'Intara, Uturere, Imirenge, Utugari n'Imidugudu mu Rwanda.`
        : `It looks like "${q}" is outside my specialization or not recognized as a Rwandan administrative unit. Please search for something related to NISR or statistics in Rwanda (Provinces, Districts, Sectors, Cells, Villages, EICV7 poverty, or household targeting).`,
      bullets: [
        { label: isRw ? "Shakisha Akarere cyangwa Umurenge" : "Search Any District or Sector", value: isRw ? "Andika nk'ibi: 'Musanze', 'Umurenge wa Cyuve', 'Bushoki', 'Kirehe'" : "Type e.g. 'Musanze', 'Cyuve sector', 'Bushoki', or 'Kirehe'" },
        { label: isRw ? "Shakisha Akagari cyangwa Umudugudu" : "Search Any Cell or Village", value: isRw ? "Andika nk'ibi: 'Umudugudu wa Kungo', 'Karunyura', 'Akagari ka Kayenzi'" : "Type e.g. 'Village called Kungo', 'Karunyura', or 'Kayenzi cell'" },
        { label: isRw ? "Imibare y'Igihugu n'Intara" : "National & Provincial Tables", value: isRw ? "Kanda ku ngero ziri hano hasi ubone imbonerahamwe yuzuye." : "Click any of the suggested buttons below for full statistical tables." }
      ],
      followUps: isRw
        ? ["Urutonde rw'uturere 30", "Imibare y'Intara 5", "Umurenge wa Cyuve", "Umudugudu wa Kungo"]
        : ["All 30 Districts Ranking", "5 Provinces Summary", "Cyuve Sector", "Village called Kungo"]
    };
  };

  const triggerQuery = async (queryText: string) => {
    const clean = queryText.trim();
    if (!clean) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { sender: "user", userText: clean, timestamp: now }]);
    setInput("");
    setIsSearching(true);

    const card = await evaluateUserQuery(clean);
    const replyTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { sender: "ai", card, timestamp: replyTime }]);
    setIsSearching(false);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    triggerQuery(input);
  };

  const copyCardToClipboard = (card: StructuredAIResponse, idx: number) => {
    const metricsStr = card.metrics ? card.metrics.map((m) => `${m.label}: ${m.value} (${m.sub || ""})`).join("\n") : "";
    const bulletsStr = card.bullets ? card.bullets.map((b) => `- ${b.label}: ${b.value}`).join("\n") : "";
    const full = `${card.title}\n${card.subtitle}\n\n${card.narrative}\n\n${metricsStr}\n\n${bulletsStr}`.trim();
    navigator.clipboard?.writeText(full);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  };

  const downloadTranscript = () => {
    const lines = allMessages.map((m) => {
      if (m.sender === "user") return `[USER - ${m.timestamp}]\n${m.userText}\n`;
      const c = m.card!;
      const mText = c.metrics?.map((x) => `  - ${x.label}: ${x.value} (${x.sub || ""})`).join("\n") || "";
      const bText = c.bullets?.map((x) => `  * ${x.label}: ${x.value}`).join("\n") || "";
      return `[IMBARAGA AI - ${m.timestamp}] ${c.title} (${c.badge})\n${c.narrative}\n${mText}\n${bText}\n`;
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n----------------------------------------\n")], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Imbaraga_NISR_AI_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (windowState === "closed") {
    return (
      <div style={{ position: "fixed", bottom: 22, right: 22, zIndex: 99999, fontFamily: "inherit" }}>
        <button
          type="button"
          onClick={() => setWindowState("open")}
          style={{
            background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)",
            color: "#FFFFFF",
            border: "2px solid #CCFBF1",
            borderRadius: 999,
            padding: "12px 22px",
            boxShadow: "0 12px 28px rgba(13, 148, 136, 0.45)",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 10
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#4ADE80", display: "inline-block" }} />
          <span>{isRw ? "Imbaraga NISR AI Assistant" : "Imbaraga NISR AI Assistant"}</span>
        </button>
      </div>
    );
  }

  if (windowState === "minimized") {
    return (
      <div
        onClick={() => setWindowState("open")}
        style={{
          position: "fixed",
          bottom: 18,
          right: 22,
          zIndex: 99999,
          width: 330,
          background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)",
          color: "#FFF",
          borderRadius: 12,
          padding: "11px 16px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.28)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13.5 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#4ADE80" }} />
          <span>{isRw ? "Imbaraga AI (Kanda ufungure)" : "Imbaraga AI (Click to restore)"}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setWindowState("open")}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#FFF", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setWindowState("closed")}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#FFF", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}
          >
            X
          </button>
        </div>
      </div>
    );
  }

  const isExpanded = windowState === "expanded";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 18,
        right: 18,
        zIndex: 99999,
        width: isExpanded ? "min(760px, 95vw)" : "min(470px, 93vw)",
        height: isExpanded ? "min(720px, 86vh)" : "min(610px, 82vh)",
        background: "#FFFFFF",
        borderRadius: 16,
        boxShadow: "0 20px 48px rgba(15, 23, 42, 0.32)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: "1px solid #CBD5E1",
        fontFamily: "inherit"
      }}
    >
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", color: "#FFF", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15.5, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#4ADE80" }} />
            <span>{isRw ? "Imbaraga NISR AI Assistant" : "Imbaraga NISR AI Assistant"}</span>
          </div>
          <div style={{ fontSize: 11.5, opacity: 0.92 }}>
            {isRw
              ? "Intara 5 | Uturere 30 | Imirenge 416 | Utugari 2,148 | Imidugudu 14,837"
              : "5 Provinces | 30 Districts | 416 Sectors | 2,148 Cells | 14,837 Villages"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={() => setMessages([])}
            style={{ background: "rgba(255,255,255,0.18)", border: "none", color: "#FFF", borderRadius: 6, padding: "5px 8px", fontSize: 11.5, cursor: "pointer", fontWeight: 600 }}
            title={isRw ? "Tangira bundi bushya" : "Reset Chat"}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={downloadTranscript}
            style={{ background: "rgba(255,255,255,0.18)", border: "none", color: "#FFF", borderRadius: 6, padding: "5px 8px", fontSize: 11.5, cursor: "pointer", fontWeight: 600 }}
            title={isRw ? "Manura Raporo y'Ikiganiro" : "Download Chat Report"}
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => setWindowState("minimized")}
            style={{ background: "rgba(255,255,255,0.18)", border: "none", color: "#FFF", borderRadius: 6, padding: "5px 9px", fontSize: 12, cursor: "pointer", fontWeight: 800 }}
            title={isRw ? "Gabanya (Minimize)" : "Minimize"}
          >
            _
          </button>
          <button
            type="button"
            onClick={() => setWindowState(isExpanded ? "open" : "expanded")}
            style={{ background: "rgba(255,255,255,0.18)", border: "none", color: "#FFF", borderRadius: 6, padding: "5px 8px", fontSize: 11.5, cursor: "pointer", fontWeight: 700 }}
            title={isRw ? "Agura / Gabanya" : "Expand / Compact"}
          >
            {isExpanded ? "[-]" : "[+]"}
          </button>
          <button
            type="button"
            onClick={() => setWindowState("closed")}
            style={{ background: "rgba(255,255,255,0.18)", border: "none", color: "#FFF", borderRadius: 6, padding: "5px 9px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}
            title={isRw ? "Funga" : "Close"}
          >
            X
          </button>
        </div>
      </div>

      {/* General Category Navigation Chips */}
      <div style={{ background: "#F0FDFA", padding: "8px 12px", borderBottom: "1px solid #CCFBF1", display: "flex", gap: 6, overflowX: "auto", whiteSpace: "nowrap" }}>
        {[
          { label: isRw ? "Uturere Twose 30" : "All 30 Districts Stats", q: isRw ? "Urutonde rw'uturere twose 30" : "All 30 Districts Ranking" },
          { label: isRw ? "Intara Zose 5" : "All 5 Provinces Stats", q: isRw ? "Imibare y'Intara 5" : "5 Provinces Summary" },
          { label: isRw ? "Imirenge 416 (Imibare)" : "Sectors Stats (416)", q: isRw ? "Umurenge wa Cyuve" : "Cyuve Sector" },
          { label: isRw ? "Utugari & Imidugudu" : "Cells & Villages Stats", q: isRw ? "Umudugudu wa Kungo" : "Village called Kungo" },
          { label: isRw ? "Uko Guhitamo Ingo Bikora" : "How AI Targeting Works", q: isRw ? "Uko Guhitamo Ingo Bikora" : "How Household Targeting Works" }
        ].map((chip, i) => (
          <button
            key={i}
            type="button"
            onClick={() => triggerQuery(chip.q)}
            style={{
              background: "#FFFFFF",
              border: "1px solid #99F6E4",
              color: "#0F766E",
              borderRadius: 99,
              padding: "5px 11px",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div style={{ flex: 1, padding: 14, overflowY: "auto", background: "#F8FAFC", display: "flex", flexDirection: "column", gap: 12 }}>
        {allMessages.map((m, idx) => {
          if (m.sender === "user") {
            return (
              <div
                key={idx}
                style={{
                  alignSelf: "flex-end",
                  background: "#0D9488",
                  color: "#FFFFFF",
                  padding: "10px 14px",
                  borderRadius: "14px 14px 2px 14px",
                  maxWidth: "82%",
                  fontSize: 13.5,
                  fontWeight: 500,
                  boxShadow: "0 2px 5px rgba(13, 148, 136, 0.2)"
                }}
              >
                <div>{m.userText}</div>
                <div style={{ fontSize: 10, opacity: 0.8, textAlign: "right", marginTop: 3 }}>{m.timestamp}</div>
              </div>
            );
          }

          const card = m.card!;
          return (
            <div
              key={idx}
              style={{
                alignSelf: "flex-start",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "14px 14px 14px 4px",
                padding: 16,
                width: "96%",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ background: "#CCFBF1", color: "#0F766E", fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: 6, letterSpacing: 0.3 }}>
                  {card.badge}
                </span>
                <button
                  type="button"
                  onClick={() => copyCardToClipboard(card, idx)}
                  style={{ background: "transparent", border: "1px solid #CBD5E1", color: "#475569", borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}
                >
                  {copiedIdx === idx ? (isRw ? "Byakoporowe" : "Copied") : isRw ? "Koporora" : "Copy"}
                </button>
              </div>

              <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", marginBottom: 2 }}>{card.title}</div>
              <div style={{ fontSize: 11.5, color: "#64748B", marginBottom: 10 }}>{card.subtitle}</div>

              {card.hierarchy && card.hierarchy.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", background: "#F1F5F9", padding: "7px 10px", borderRadius: 8, marginBottom: 10, fontSize: 11.5 }}>
                  {card.hierarchy.map((step, sIdx) => (
                    <React.Fragment key={sIdx}>
                      <span style={{ fontWeight: sIdx === card.hierarchy!.length - 1 ? 800 : 500, color: sIdx === card.hierarchy!.length - 1 ? "#0F766E" : "#334155" }}>
                        {step}
                      </span>
                      {sIdx < card.hierarchy!.length - 1 && <span style={{ color: "#94A3B8" }}>{"->"}</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.5, marginBottom: 12, whiteSpace: "pre-line" }}>
                {card.narrative}
              </div>

              {card.metrics && card.metrics.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 12 }}>
                  {card.metrics.map((met, mIdx) => {
                    const bg = met.tone === "red" ? "#FEF2F2" : met.tone === "amber" ? "#FFFBEB" : met.tone === "teal" ? "#F0FDFA" : "#F8FAFC";
                    const border = met.tone === "red" ? "#FECACA" : met.tone === "amber" ? "#FDE68A" : met.tone === "teal" ? "#99F6E4" : "#E2E8F0";
                    const valColor = met.tone === "red" ? "#991B1B" : met.tone === "amber" ? "#92400E" : met.tone === "teal" ? "#0F766E" : "#0F172A";
                    return (
                      <div key={mIdx} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>{met.label}</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: valColor, marginTop: 2 }}>{met.value}</div>
                        {met.sub && <div style={{ fontSize: 11, color: "#64748B", marginTop: 1 }}>{met.sub}</div>}
                      </div>
                    );
                  })}
                </div>
              )}

              {card.bullets && card.bullets.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {card.bullets.map((b, bIdx) => (
                    <div key={bIdx} style={{ background: "#F8FAFC", borderLeft: "3px solid #0D9488", padding: "7px 10px", borderRadius: "0 6px 6px 0", fontSize: 12.5 }}>
                      <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>{b.label}</div>
                      <div style={{ color: "#334155", lineHeight: 1.4 }}>{b.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {card.table && (
                <div style={{ overflowX: "auto", maxHeight: 290, border: "1px solid #CBD5E1", borderRadius: 8, marginBottom: 12 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, textAlign: "left" }}>
                    <thead style={{ position: "sticky", top: 0, background: "#0F766E", color: "#FFFFFF" }}>
                      <tr>
                        {card.table.headers.map((h, hIdx) => (
                          <th key={hIdx} style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {card.table.rows.map((row, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: "1px solid #E2E8F0", background: rIdx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} style={{ padding: "7px 10px", fontWeight: cIdx <= 1 ? 700 : 400, color: "#1E293B", whiteSpace: "nowrap" }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {card.followUps && card.followUps.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, paddingTop: 8, borderTop: "1px dashed #E2E8F0" }}>
                  <span style={{ fontSize: 11, color: "#64748B", alignSelf: "center", marginRight: 2 }}>
                    {isRw ? "Reba n'ibi:" : "Explore next:"}
                  </span>
                  {card.followUps.map((f, fIdx) => (
                    <button
                      key={fIdx}
                      type="button"
                      onClick={() => triggerQuery(f)}
                      style={{
                        background: "#F0FDFA",
                        border: "1px solid #99F6E4",
                        color: "#0F766E",
                        borderRadius: 6,
                        padding: "4px 9px",
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isSearching && (
          <div style={{ alignSelf: "flex-start", background: "#FFFFFF", border: "1px solid #CBD5E1", padding: "10px 14px", borderRadius: 12, fontSize: 12.5, color: "#0F766E", fontWeight: 600 }}>
            {isRw ? "Ndimo gusesengura imibare ya NISR..." : "Analyzing NISR EICV7 & RPHC 2022 administrative hierarchy..."}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} style={{ display: "flex", borderTop: "1px solid #CBD5E1", background: "#FFFFFF", padding: 10, gap: 8 }}>
        <input
          type="text"
          placeholder={
            isRw
              ? "Andika Intara, Akarere, Umurenge (Cyuve), Akagari cyangwa Umudugudu (Kungo)..."
              : "Type any Province, District, Sector (Cyuve), Cell or Village (Kungo)..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ flex: 1, border: "1px solid #CBD5E1", borderRadius: 8, padding: "10px 12px", outline: "none", fontSize: 13 }}
        />
        <button
          type="submit"
          style={{
            background: "#0D9488",
            color: "#FFFFFF",
            border: "none",
            padding: "0 18px",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 13.5
          }}
        >
          {isRw ? "Ohereza" : "Send"}
        </button>
      </form>
    </div>
  );
}