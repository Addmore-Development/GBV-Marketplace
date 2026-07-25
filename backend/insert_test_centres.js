// insert_test_centres.js
// Runs the 5 test-centre inserts directly against DATABASE_URL using the
// app's own "pg" dependency -- no psql client needed.
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : undefined,
});

const sql = `-- ============================================================
-- Re-insert the 5 test centre registrations directly into the DB.
-- Matches the centres table columns used by centre.controller.ts
-- registerCentre(). All five land as status = 'pending' (table default),
-- ready for approval in /admin -> Centres tab.
--
-- Password for ALL five centres: Happy@123
-- (bcrypt, 12 rounds, pre-hashed below so this runs with no app code)
-- ============================================================

BEGIN;

-- 1. Thistlewood Haven (GBV Centre — Cape Town)
INSERT INTO centres (
  centre_type, centre_name, registration_number, npo_number, dsd_number,
  tax_exemption_number, year_established,
  contact_person_name, contact_person_role, contact_email, contact_phone,
  whatsapp_number, website_url,
  physical_address, suburb, city, province, postal_code,
  description, mission_statement,
  services_offered, target_population, languages_spoken,
  capacity_total, is_24_hour,
  emergency_protocol, confidentiality_policy,
  has_shelter, provides_legal_support, provides_counselling,
  password_hash
) VALUES (
  'gbv_centre', 'Thistlewood Haven', '2019/112233/08', '045-231-NPO', 'DSD/WC/2019/0442',
  'PBO 930012345', 2019,
  'Nomvula Dlamini', 'Centre Director', 'contact@thistlewoodhaven.org.za', '0214567890',
  '0834567890', 'https://www.thistlewoodhaven.org.za',
  '12 Milton Road, Observatory', 'Observatory', 'Cape Town', 'Western Cape', '7925',
  'Thistlewood Haven has supported survivors of gender-based violence in Cape Town since 2019. We provide emergency shelter, trauma-informed counselling, legal referrals, and skills training to help women rebuild independent, safe lives after crisis.',
  'To provide a safe, dignified refuge where survivors can heal and rebuild their futures.',
  ARRAY['Emergency shelter','Counselling / therapy','Legal support','Job skills training'],
  ARRAY['GBV survivors','Women & girls'],
  ARRAY['English','Afrikaans','Xhosa'],
  35, true,
  'On disclosure of immediate danger, staff activate our safety plan: secure transport is arranged, SAPS is contacted where consent is given, and the survivor is moved to a secure intake room within 15 minutes.',
  'All survivor information is kept strictly confidential and is only shared with third parties with the survivor''s explicit written consent, except where required by law.',
  true, true, true,
  '$2b$12$c/prHLW9V38ISiuVOrO/OewP5k1lBOACQQZgqrBGB6QLFoTZAU95.'
);

-- 2. New Dawn Support Network (GBV Centre — Johannesburg)
INSERT INTO centres (
  centre_type, centre_name, registration_number, npo_number, dsd_number,
  tax_exemption_number, year_established,
  contact_person_name, contact_person_role, contact_email, contact_phone,
  whatsapp_number, website_url,
  physical_address, suburb, city, province, postal_code,
  description, mission_statement,
  services_offered, target_population, languages_spoken,
  capacity_total, is_24_hour,
  emergency_protocol, confidentiality_policy,
  has_shelter, provides_court_support, law_enforcement_partnership,
  password_hash
) VALUES (
  'gbv_centre', 'New Dawn Support Network', '2015/098765/08', '128-560-NPO', 'DSD/GP/2015/0987',
  'PBO 930098765', 2015,
  'Palesa Mokoena', 'Programme Manager', 'info@newdawnnetwork.org.za', '0119876543',
  '0827654321', NULL,
  '88 Vilakazi Street, Soweto', 'Soweto', 'Johannesburg', 'Gauteng', '1818',
  'New Dawn Support Network operates a 24-hour crisis line and safe house for survivors of domestic violence and human trafficking across Soweto. Our team runs a dedicated skills programme and works closely with local SAPS and social workers on every case.',
  'Every woman deserves a second chance at a safe, dignified, independent life.',
  ARRAY['Safe house','Counselling / therapy','Police liaison','Court accompaniment'],
  ARRAY['GBV survivors','Women & girls','Youth (13–24)'],
  ARRAY['Zulu','Sotho','English','Xhosa'],
  30, true,
  'Any disclosure of active danger triggers immediate relocation to our safe house and a call to our on-call social worker, available 24/7.',
  'Survivor identities and case details are never disclosed without consent, and all records are stored on access-controlled systems.',
  true, true, 'Partnered with Orlando SAPS for expedited case handling and joint safety planning.',
  '$2b$12$c/prHLW9V38ISiuVOrO/OewP5k1lBOACQQZgqrBGB6QLFoTZAU95.'
);

-- 3. Sunrise Children's Haven (Orphanage — Durban)
INSERT INTO centres (
  centre_type, centre_name, registration_number, npo_number, dsd_number,
  tax_exemption_number, year_established,
  contact_person_name, contact_person_role, contact_email, contact_phone,
  whatsapp_number, website_url,
  physical_address, suburb, city, province, postal_code,
  description, mission_statement,
  services_offered, target_population, languages_spoken,
  capacity_total, is_24_hour,
  emergency_protocol, confidentiality_policy,
  age_range_min, age_range_max, education_programs,
  password_hash
) VALUES (
  'orphanage', 'Sunrise Children''s Haven', '2011/045678/08', '067-341-NPO', 'DSD/KZN/2011/0221',
  'PBO 930045678', 2011,
  'Thandeka Ngcobo', 'House Mother / Administrator', 'admin@sunrisechildrenshaven.org.za', '0319876540',
  '0736758493', 'https://www.sunrisechildrenshaven.org.za',
  '4 Che Guevara Road, Umlazi', 'Umlazi', 'Durban', 'KwaZulu-Natal', '4031',
  'Sunrise Children''s Haven provides residential care, schooling support, and vocational training for orphaned and abandoned children in Umlazi. We run four cottage homes, an on-site aftercare programme, and a partnership with a local primary school for daily transport and tutoring.',
  'Every child deserves a stable home, an education, and a future full of possibility.',
  ARRAY['Children''s programmes','Food & nutrition','Job skills training'],
  ARRAY['Children (0–12)','Youth (13–24)'],
  ARRAY['Zulu','English'],
  60, true,
  'Any safeguarding concern is escalated immediately to the on-site child protection officer and reported to DSD within 24 hours per our safeguarding policy.',
  'Children''s records and personal histories are kept confidential and only shared with DSD, legal guardians, or law enforcement as required.',
  0, 18, 'On-site homework support, partnership with Umlazi Primary for schooling, and a computer literacy lab for teens.',
  '$2b$12$c/prHLW9V38ISiuVOrO/OewP5k1lBOACQQZgqrBGB6QLFoTZAU95.'
);

-- 4. Khanya Golden Years (Old Age Home — Pretoria)
INSERT INTO centres (
  centre_type, centre_name, registration_number, npo_number, dsd_number,
  tax_exemption_number, year_established,
  contact_person_name, contact_person_role, contact_email, contact_phone,
  whatsapp_number, website_url,
  physical_address, suburb, city, province, postal_code,
  description, mission_statement,
  services_offered, target_population, languages_spoken,
  capacity_total, is_24_hour,
  emergency_protocol, confidentiality_policy,
  care_level, medical_facilities,
  password_hash
) VALUES (
  'old_age_home', 'Khanya Golden Years', '2003/011223/08', '093-772-NPO', 'DSD/GP/2003/0119',
  'PBO 930011223', 2003,
  'Johannes van der Merwe', 'Facility Manager', 'admin@khanyagoldenyears.co.za', '0123456780',
  '0845671234', NULL,
  '21 Lillian Ngoyi Street, Atteridgeville', 'Atteridgeville', 'Pretoria', 'Gauteng', '0008',
  'Khanya Golden Years provides full-time residential and nursing care for elderly South Africans without family support. Our facility offers assisted living, on-site nursing care, and a craft workshop that connects residents to income-generating opportunities through the Amani marketplace.',
  'Ageing with dignity, living with purpose, and staying connected to community.',
  ARRAY['Elderly care','Medical care','Job skills training'],
  ARRAY['Elderly (60+)'],
  ARRAY['Afrikaans','English','Tswana','Pedi'],
  80, true,
  'Medical emergencies are handled by on-site nursing staff first, with an ambulance called immediately for anything beyond first-response care; next of kin are notified within the hour.',
  'Resident medical and personal records are kept strictly confidential in line with POPIA and only shared with next of kin or medical professionals involved in care.',
  'Full care', 'On-site nursing station staffed 24/7, with a visiting doctor twice weekly and a dedicated dementia care wing.',
  '$2b$12$c/prHLW9V38ISiuVOrO/OewP5k1lBOACQQZgqrBGB6QLFoTZAU95.'
);

-- 5. Ubuntu Bay Recovery Centre (GBV Centre — Port Elizabeth / Gqeberha)
INSERT INTO centres (
  centre_type, centre_name, registration_number, npo_number, dsd_number,
  tax_exemption_number, year_established,
  contact_person_name, contact_person_role, contact_email, contact_phone,
  whatsapp_number, website_url,
  physical_address, suburb, city, province, postal_code,
  description, mission_statement,
  services_offered, target_population, languages_spoken,
  capacity_total, is_24_hour,
  emergency_protocol, confidentiality_policy,
  has_shelter, provides_legal_support, provides_court_support, law_enforcement_partnership,
  password_hash
) VALUES (
  'gbv_centre', 'Ubuntu Bay Recovery Centre', '2007/077889/08', '154-982-NPO', 'DSD/EC/2007/0356',
  'PBO 930077889', 2007,
  'Lindiwe Mtshali', 'Executive Director', 'director@ubuntubayrecovery.org.za', '0414539011',
  '0798765432', 'https://www.ubuntubayrecovery.org.za',
  '9 Govan Mbeki Avenue, New Brighton', 'New Brighton', 'Port Elizabeth', 'Eastern Cape', '6001',
  'Ubuntu Bay Recovery Centre provides crisis intervention and long-term support to survivors of gender-based violence across the Eastern Cape. We run an emergency shelter, a legal clinic in partnership with a local university law faculty, and community-based support groups facilitated by trained counsellors.',
  'No woman should have to face violence alone — we walk the full journey from crisis to recovery with her.',
  ARRAY['Emergency shelter','Legal support','Counselling / therapy','Police liaison'],
  ARRAY['GBV survivors','Women & girls','People with disabilities'],
  ARRAY['Xhosa','English','Afrikaans'],
  40, true,
  'On any disclosure of imminent danger, the survivor is moved to secure shelter within the hour and a safety plan is drawn up jointly with our legal clinic and, where consented to, SAPS.',
  'All information shared by survivors is treated as strictly confidential and is never disclosed to third parties, including family members, without explicit consent.',
  true, true, true, 'Formal referral partnership with New Brighton SAPS Family Violence Unit.',
  '$2b$12$c/prHLW9V38ISiuVOrO/OewP5k1lBOACQQZgqrBGB6QLFoTZAU95.'
);

COMMIT;

-- Sanity check
SELECT id, centre_name, centre_type, status, contact_email
FROM centres
WHERE contact_email IN (
  'contact@thistlewoodhaven.org.za',
  'info@newdawnnetwork.org.za',
  'admin@sunrisechildrenshaven.org.za',
  'admin@khanyagoldenyears.co.za',
  'director@ubuntubayrecovery.org.za'
)
ORDER BY created_at;
`;

(async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(sql);
    // client.query with a multi-statement string returns an array of results;
    // the final one is our sanity-check SELECT.
    const results = Array.isArray(result) ? result : [result];
    const last = results[results.length - 1];
    console.log('Done. Rows found by sanity check:');
    console.table(last.rows);
  } catch (err) {
    console.error('Insert failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();