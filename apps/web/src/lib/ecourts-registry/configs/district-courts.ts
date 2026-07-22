import type { CourtSystemConfig } from '../types';

/**
 * District Courts (eCourts) — verified against services.ecourts.gov.in's
 * real Case Status flow: State -> District -> Court Complex/Establishment
 * -> Search Method -> only the fields that method needs.
 *
 * Reused from the existing dashboard eCourts workflow
 * (app/dashboard/matters/ecourts.tsx) rather than re-typed, so the two
 * never drift on what a "Case Type" means in this product.
 */
const CASE_TYPE_OPTIONS = [
  'Civil Suit',
  'Criminal Miscellaneous Petition',
  'Writ Petition',
  'First Appeal',
  'Special Leave Petition',
  'Consumer Complaint',
  'Execution Petition',
  'Other',
];

/** The 28 States + 8 Union Territories of India. Stable, well-documented
 * public administrative data (not eCourts-specific), included in full. */
const INDIAN_STATES_AND_UTS = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (NCT)',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

/**
 * District lists by state — a first-pass reference set covering standard,
 * stable public administrative geography. This is NOT eCourts-specific
 * data and carries the same caveat as any such reference table: district
 * boundaries do occasionally change (new districts are carved out), so
 * this should be validated against the official source periodically,
 * the same honesty standard this codebase already applies to its other
 * seed/reference datasets (see SYNTHETIC_DATA_NOTICE in mock-matters.ts).
 */
const DISTRICTS_BY_STATE: Record<string, string[]> = {
  Kerala: [
    'Thiruvananthapuram',
    'Kollam',
    'Pathanamthitta',
    'Alappuzha',
    'Kottayam',
    'Idukki',
    'Ernakulam',
    'Thrissur',
    'Palakkad',
    'Malappuram',
    'Kozhikode',
    'Wayanad',
    'Kannur',
    'Kasaragod',
  ],
  Karnataka: [
    'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar',
    'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada',
    'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar',
    'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru',
    'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir',
  ],
  'Tamil Nadu': [
    'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
    'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri',
    'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur',
    'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi',
    'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupattur',
    'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram',
    'Virudhunagar',
  ],
  Maharashtra: [
    'Ahmednagar', 'Akola', 'Amravati', 'Chhatrapati Sambhajinagar', 'Beed', 'Bhandara',
    'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon',
    'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded',
    'Nandurbar', 'Nashik', 'Dharashiv', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri',
    'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal',
  ],
  Delhi: ['New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'East Delhi', 'West Delhi', 'South Delhi', 'South East Delhi', 'South West Delhi', 'Central Delhi', 'Shahdara'],
  'Delhi (NCT)': ['New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'East Delhi', 'West Delhi', 'South Delhi', 'South East Delhi', 'South West Delhi', 'Central Delhi', 'Shahdara'],
  'Uttar Pradesh': [
    'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya', 'Azamgarh',
    'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti',
    'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah',
    'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad',
    'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun',
    'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi',
    'Kushinagar', 'Lakhimpur Kheri', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba',
    'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar',
    'Pilibhit', 'Pratapgarh', 'Prayagraj', 'Rae Bareli', 'Rampur', 'Saharanpur', 'Sambhal',
    'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur',
    'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi',
  ],
  'West Bengal': [
    'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling',
    'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda',
    'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur',
    'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur',
  ],
  Gujarat: [
    'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar',
    'Botad', 'Chhota Udepur', 'Dahod', 'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath',
    'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada',
    'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat',
    'Surendranagar', 'Tapi', 'Vadodara', 'Valsad',
  ],
  Rajasthan: [
    'Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner',
    'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur',
    'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur',
    'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi',
    'Sri Ganganagar', 'Tonk', 'Udaipur',
  ],
  Punjab: [
    'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka',
    'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana',
    'Malerkotla', 'Mansa', 'Moga', 'Muktsar', 'Pathankot', 'Patiala', 'Rupnagar',
    'Sahibzada Ajit Singh Nagar', 'Sangrur', 'Shaheed Bhagat Singh Nagar', 'Tarn Taran',
  ],
  Haryana: [
    'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar',
    'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh',
    'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar',
  ],
  'Madhya Pradesh': [
    'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul',
    'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas',
    'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad', 'Indore', 'Jabalpur',
    'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur',
    'Neemuch', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore',
    'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh',
    'Ujjain', 'Umaria', 'Vidisha',
  ],
  Telangana: [
    'Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally',
    'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Komaram Bheem', 'Mahabubabad',
    'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool',
    'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla',
    'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy',
    'Warangal', 'Hanamkonda', 'Yadadri Bhuvanagiri',
  ],
  Bihar: [
    'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar',
    'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur',
    'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger',
    'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur',
    'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali',
    'West Champaran',
  ],
  Assam: [
    'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo', 'Chirang',
    'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat',
    'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong',
    'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon', 'Nagaon', 'Nalbari',
    'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar', 'Tinsukia', 'Udalguri',
    'West Karbi Anglong',
  ],
  Odisha: [
    'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh',
    'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi',
    'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj',
    'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur',
    'Sundargarh',
  ],
  Jharkhand: [
    'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih',
    'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga',
    'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahibganj', 'Seraikela Kharsawan', 'Simdega',
    'West Singhbhum',
  ],
  Chhattisgarh: [
    'Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur', 'Bilaspur',
    'Dantewada', 'Dhamtari', 'Durg', 'Gariaband', 'Gaurela-Pendra-Marwahi', 'Janjgir-Champa',
    'Jashpur', 'Kabirdham', 'Kanker', 'Kondagaon', 'Korba', 'Koriya', 'Mahasamund',
    'Mungeli', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Sukma', 'Surajpur',
    'Surguja',
  ],
  Uttarakhand: [
    'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital',
    'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar',
    'Uttarkashi',
  ],
  'Himachal Pradesh': [
    'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti',
    'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una',
  ],
  Goa: ['North Goa', 'South Goa'],
  'Jammu and Kashmir': [
    'Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu', 'Kathua',
    'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban', 'Reasi',
    'Samba', 'Shopian', 'Srinagar', 'Udhampur',
  ],
  Ladakh: ['Kargil', 'Leh'],
  Manipur: [
    'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam',
    'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati', 'Tamenglong',
    'Tengnoupal', 'Thoubal', 'Ukhrul',
  ],
  Meghalaya: [
    'East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'North Garo Hills',
    'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills',
    'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills',
  ],
  Mizoram: [
    'Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib', 'Lawngtlai', 'Lunglei',
    'Mamit', 'Saiha', 'Saitual', 'Serchhip',
  ],
  Nagaland: [
    'Chumoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon',
    'Niuland', 'Noklak', 'Peren', 'Phek', 'Shamator', 'Tuensang', 'Tseminyu', 'Wokha', 'Zunheboto',
  ],
  Tripura: [
    'Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura',
    'Unakoti', 'West Tripura',
  ],
  Sikkim: ['East Sikkim', 'North Sikkim', 'South Sikkim', 'West Sikkim', 'Pakyong', 'Soreng'],
  'Arunachal Pradesh': [
    'Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Kamle', 'Kra Daadi',
    'Kurung Kumey', 'Lepa Rada', 'Lohit', 'Longding', 'Lower Dibang Valley', 'Lower Siang',
    'Lower Subansiri', 'Namsai', 'Pakke Kessang', 'Papum Pare', 'Shi Yomi', 'Siang',
    'Tawang', 'Tirap', 'Upper Dibang Valley', 'Upper Siang', 'Upper Subansiri',
    'West Kameng', 'West Siang',
  ],
  Chandigarh: ['Chandigarh'],
  Puducherry: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
  Lakshadweep: ['Lakshadweep'],
  'Andaman and Nicobar Islands': ['Nicobar', 'North and Middle Andaman', 'South Andaman'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Dadra and Nagar Haveli', 'Daman', 'Diu'],
};

/**
 * Court Establishment lists are the least standardized tier of this data
 * — real complex names, verified per district. Populated for Ernakulam
 * (Kerala) only, sourced from districts.ecourts.gov.in and
 * ernakulam.dcourts.gov.in, as the one fully verified end-to-end example.
 * Every other district falls back to free-text rather than a guessed
 * list — see OptionsResolver in ../types.ts.
 */
const COURT_ESTABLISHMENTS_BY_DISTRICT: Record<string, string[]> = {
  Ernakulam: [
    'Principal District Court, Ernakulam',
    'Munsiff Court, Ernakulam',
    'Munsiff Court, Kochi',
    'Munsiff Court, Aluva',
    'Munsiff Court, North Paravur',
    'Munsiff Court, Perumbavoor',
    'Munsiff Court, Muvattupuzha',
    'Munsiff Court, Kolenchery',
    'Munsiff Court, Kothamangalam',
    'Family Court, Ernakulam',
    'Family Court, Muvattupuzha',
    'Family Court, North Paravur',
    'Family Court, Aluva',
    'Motor Accident Claims Tribunal, Ernakulam',
    'Chief Judicial Magistrate Court, Ernakulam',
  ],
};

function districtsForState(selections: Record<string, string>): string[] | 'free-text' {
  const state = selections.state;
  if (!state) return [];
  return DISTRICTS_BY_STATE[state] ?? 'free-text';
}

function establishmentsForDistrict(selections: Record<string, string>): string[] | 'free-text' {
  const district = selections.district;
  if (!district) return [];
  return COURT_ESTABLISHMENTS_BY_DISTRICT[district] ?? 'free-text';
}

export const districtCourtsConfig: CourtSystemConfig = {
  id: 'district-courts',
  label: 'District Courts (eCourts)',
  status: 'available',
  steps: [
    {
      kind: 'select',
      key: 'state',
      label: 'Select State',
      placeholder: 'Select State',
      options: INDIAN_STATES_AND_UTS,
    },
    {
      kind: 'select',
      key: 'district',
      label: 'Select District',
      placeholder: 'Select District',
      options: districtsForState,
      freeTextPlaceholder: 'Enter district name',
    },
    {
      kind: 'select',
      key: 'courtEstablishment',
      label: 'Select Court Establishment',
      placeholder: 'Select Court Establishment',
      options: establishmentsForDistrict,
      freeTextPlaceholder: 'Enter court establishment / complex name',
    },
    {
      kind: 'search-method',
      key: 'searchMethod',
      label: 'Select Search Method',
      methods: [
        {
          key: 'cnr',
          label: 'CNR Number',
          fields: [
            {
              key: 'cnrNumber',
              label: 'CNR Number',
              type: 'text',
              placeholder: 'e.g. KLEK010012342024',
              maxLength: 16,
              helpText: 'A 16-character alphanumeric CNR.',
            },
          ],
        },
        {
          key: 'case_number',
          label: 'Case Number',
          fields: [
            { key: 'caseType', label: 'Case Type', type: 'select', options: CASE_TYPE_OPTIONS },
            { key: 'caseNumber', label: 'Case Number', type: 'text', placeholder: 'e.g. 214' },
            { key: 'year', label: 'Year', type: 'text', placeholder: 'e.g. 2024', maxLength: 4 },
          ],
        },
        {
          key: 'filing_number',
          label: 'Filing Number',
          fields: [
            { key: 'filingNumber', label: 'Filing Number', type: 'text' },
            { key: 'year', label: 'Year', type: 'text', maxLength: 4 },
          ],
        },
        {
          key: 'fir_number',
          label: 'FIR Number',
          fields: [
            { key: 'firNumber', label: 'FIR Number', type: 'text' },
            { key: 'year', label: 'Year', type: 'text', maxLength: 4 },
            { key: 'policeStation', label: 'Police Station', type: 'text' },
          ],
        },
        {
          key: 'party_name',
          label: 'Party Name',
          fields: [
            {
              key: 'partyName',
              label: 'Party Name',
              type: 'text',
              placeholder: 'e.g. Ramesh Kumar',
              helpText: 'Enter at least 3 characters — full or partial name.',
            },
          ],
        },
        {
          key: 'advocate_name',
          label: 'Advocate Name',
          fields: [{ key: 'advocateName', label: 'Advocate Name', type: 'text' }],
        },
        {
          key: 'act',
          label: 'Act',
          fields: [{ key: 'actName', label: 'Act', type: 'text', placeholder: 'e.g. Negotiable Instruments Act' }],
        },
      ],
    },
  ],
};
