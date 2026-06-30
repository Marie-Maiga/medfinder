-- Active l'extension trigram en premier
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Table medicines : base de médicaments pour l'autocomplétion
CREATE TABLE IF NOT EXISTS medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  synonyms text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Index pour la recherche rapide (insensible à la casse + accents)
CREATE INDEX IF NOT EXISTS medicines_name_trgm ON medicines USING gin (name gin_trgm_ops);

-- RLS
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire (opérateurs, interface patient future)
CREATE POLICY "medicines_read" ON medicines FOR SELECT USING (true);

-- Seed : médicaments courants au Niger / Afrique de l'Ouest
INSERT INTO medicines (name, synonyms) VALUES
-- Antalgiques / antipyrétiques
('Paracétamol', ARRAY['Doliprane', 'Efferalgan', 'Dafalgan', 'Panadol', 'Tylenol']),
('Ibuprofène', ARRAY['Advil', 'Nurofen', 'Brufen', 'Ibuprofen']),
('Aspirine', ARRAY['Aspegic', 'Aspirin', 'AAS', 'Acide acetylsalicylique']),
('Diclofénac', ARRAY['Voltarène', 'Voltaren', 'Diclofenac sodique']),
('Kétoprofène', ARRAY['Profenid', 'Ketoprofen']),
('Tramadol', ARRAY['Tramal', 'Zamudol', 'Topalgic']),
('Codéine', ARRAY['Codeine', 'Codenfan']),
('Acide méfénamique', ARRAY['Ponstyl', 'Mefenamic acid']),

-- Antibiotiques
('Amoxicilline', ARRAY['Amoxil', 'Clamoxyl', 'Amoxicillin']),
('Amoxicilline + Acide clavulanique', ARRAY['Augmentin', 'Amoxiclav', 'Claventin']),
('Ampicilline', ARRAY['Totapen', 'Ampicillin']),
('Doxycycline', ARRAY['Vibramycine', 'Doxylin', 'Doxycyclin']),
('Tétracycline', ARRAY['Tetracycline']),
('Azithromycine', ARRAY['Zithromax', 'Azithromycin', 'Azadose']),
('Érythromycine', ARRAY['Erythrocine', 'Erythromycin']),
('Ciprofloxacine', ARRAY['Ciflox', 'Ciprobay', 'Ciprofloxacin']),
('Ofloxacine', ARRAY['Oflocet', 'Ofloxacin']),
('Métronidazole', ARRAY['Flagyl', 'Metronidazol']),
('Cotrimoxazole', ARRAY['Bactrim', 'Septrin', 'TMP-SMX', 'Trimethoprime-sulfamethoxazole']),
('Céfalexine', ARRAY['Keflex', 'Cephalexin']),
('Céfixime', ARRAY['Oroken', 'Suprax', 'Cefixime']),
('Clindamycine', ARRAY['Dalacine', 'Clindamycin']),
('Gentamicine', ARRAY['Gentalline', 'Gentamicin']),
('Tétracycline pommade oculaire', ARRAY['Terramycine ophtalmique']),
('Ceftriaxone', ARRAY['Rocéphine', 'Ceftriaxon']),

-- Antipaludéens (essentiels au Niger)
('Artéméther + Luméfantrine', ARRAY['Coartem', 'Riamet', 'Lumartem']),
('Artésunate', ARRAY['Arsumax', 'Artesunate']),
('Artéméther', ARRAY['Paluther', 'Artemether']),
('Dihydroartémisinine + Pipéraquine', ARRAY['Eurartesim', 'DHA-PPQ']),
('Quinine', ARRAY['Quinimax', 'Quinine sulfate']),
('Chloroquine', ARRAY['Nivaquine', 'Chloroquin']),
('Méfloquine', ARRAY['Lariam', 'Mefloquine']),
('Sulfadoxine + Pyriméthamine', ARRAY['Fansidar', 'SP', 'Sulfadoxine']),
('Amodiaquine', ARRAY['Camoquin', 'Amodiaquine']),

-- Antiparasitaires / antihelminthiques
('Mébendazole', ARRAY['Vermox', 'Mebendazole']),
('Albendazole', ARRAY['Zentel', 'Albendazole']),
('Ivermectine', ARRAY['Mectizan', 'Stromectol', 'Ivermectin']),
('Métronidazole suspension', ARRAY['Flagyl suspension']),
('Niclosamide', ARRAY['Tredemine']),
('Pyrantel', ARRAY['Combantrin', 'Pyrantel pamoate']),

-- Antifongiques
('Fluconazole', ARRAY['Triflucan', 'Diflucan', 'Fluconazol']),
('Kétoconazole', ARRAY['Nizoral', 'Ketoconazol']),
('Nystatine', ARRAY['Mycostatine', 'Nystatin']),
('Griséofulvine', ARRAY['Fulcine', 'Griseofulvin']),
('Clotrimazole', ARRAY['Mycohydralin', 'Canesten']),
('Miconazole', ARRAY['Daktarin', 'Miconazole']),

-- Antiviraux
('Aciclovir', ARRAY['Zovirax', 'Acyclovir']),
('Oseltamivir', ARRAY['Tamiflu', 'Oseltamivir']),

-- Antiretroviraux (usage courant)
('Tenofovir', ARRAY['Viread', 'TDF']),
('Lamivudine', ARRAY['Epivir', '3TC']),
('Efavirenz', ARRAY['Stocrin', 'EFV']),
('Lopinavir + Ritonavir', ARRAY['Kaletra', 'Aluvia']),

-- Antituberculeux
('Rifampicine', ARRAY['Rimactan', 'Rifampin']),
('Isoniazide', ARRAY['INH', 'Rimifon']),
('Pyrazinamide', ARRAY['Pyrazinamide']),
('Éthambutol', ARRAY['Myambutol', 'Ethambutol']),

-- Cardiovasculaires
('Amlodipine', ARRAY['Amlor', 'Norvasc', 'Amlodipine']),
('Nifédipine', ARRAY['Adalate', 'Nifedipine']),
('Captopril', ARRAY['Lopril', 'Captopril']),
('Énalapril', ARRAY['Renitec', 'Enalapril']),
('Losartan', ARRAY['Cozaar', 'Losartan']),
('Atenolol', ARRAY['Tenormine', 'Atenolol']),
('Propranolol', ARRAY['Avlocardyl', 'Inderal']),
('Metoprolol', ARRAY['Seloken', 'Lopressor']),
('Furosémide', ARRAY['Lasilix', 'Furosemide', 'Lasix']),
('Hydrochlorothiazide', ARRAY['Esidrex', 'HCT', 'HCTZ']),
('Spironolactone', ARRAY['Aldactone', 'Spironolactone']),
('Digoxine', ARRAY['Digoxin', 'Lanoxin']),
('Aspirine 100mg (cardio)', ARRAY['Cardioaspirine', 'Aspirin cardio']),
('Simvastatine', ARRAY['Zocor', 'Simvastatin']),
('Atorvastatine', ARRAY['Tahor', 'Lipitor', 'Atorvastatin']),
('Nitroglycérine', ARRAY['Natispray', 'Trinitrine', 'Nitroglycerine']),
('Isosorbide dinitrate', ARRAY['Risordan', 'Isocard']),

-- Diabète
('Metformine', ARRAY['Glucophage', 'Metformin']),
('Glibenclamide', ARRAY['Daonil', 'Glibenclamide']),
('Glicazide', ARRAY['Diamicron', 'Gliclazide']),
('Insuline humaine', ARRAY['Actrapid', 'Humulin', 'Insulin']),
('Insuline glargine', ARRAY['Lantus', 'Toujeo']),

-- Respiratoire
('Salbutamol', ARRAY['Ventoline', 'Salbutamol', 'Albuterol']),
('Béclométasone inhalateur', ARRAY['Becotide', 'Beclometasone']),
('Aminophylline', ARRAY['Aminophylline', 'Théophylline']),
('Bromhexine', ARRAY['Bisolvon', 'Bromhexine']),
('Ambroxol', ARRAY['Mucosolvan', 'Surbronc', 'Ambroxol']),
('Prednisolone', ARRAY['Solupred', 'Prednisolone']),
('Dexaméthasone', ARRAY['Dectancyl', 'Dexamethasone']),

-- Gastro-intestinal
('Oméprazole', ARRAY['Mopral', 'Losec', 'Omeprazole']),
('Ranitidine', ARRAY['Azantac', 'Ranitidine']),
('Métoclopramide', ARRAY['Primpéran', 'Metoclopramide']),
('Dompéridone', ARRAY['Motilium', 'Domperidone']),
('Lopéramide', ARRAY['Imodium', 'Loperamide']),
('SRO', ARRAY['Sel de réhydratation orale', 'ORS', 'SRO', 'Gastrolyte']),
('Zinc sulfate', ARRAY['Zinc', 'Zinc sulfate']),
('Charbon activé', ARRAY['Carbomix', 'Charbon vegetal']),
('Spasfon', ARRAY['Phloroglucinol', 'Tiemonium']),
('Mébévérine', ARRAY['Duspatalin', 'Mebeverine']),
('Fer + Acide folique', ARRAY['Tardyferon B9', 'Fer folate']),
('Sulfate ferreux', ARRAY['Fero-Gradumet', 'Fer', 'Sulfate ferreux']),

-- Vitamines / Minéraux / Suppléments
('Vitamine C', ARRAY['Ascorbate', 'Acide ascorbique', 'Cévitamine']),
('Vitamine D', ARRAY['Uvesterol', 'Cholecalciferol', 'Vitamine D3']),
('Vitamine B complexe', ARRAY['Becozyme', 'Neurobion', 'Vitamine B']),
('Acide folique', ARRAY['Spéciafoldine', 'Folate', 'Folic acid']),
('Calcium', ARRAY['Calciprat', 'Cacit', 'Calcium']),
('Magnésium', ARRAY['Mag2', 'Magnesium']),
('Multivitamines', ARRAY['Supradyn', 'Centrum', 'Vitamines']),
('Rétinol', ARRAY['Vitamine A', 'Retinol']),

-- Neurologie / Psychiatrie
('Diazépam', ARRAY['Valium', 'Diazepam']),
('Phénobarbital', ARRAY['Gardenal', 'Phenobarbital']),
('Carbamazépine', ARRAY['Tegretol', 'Carbamazepine']),
('Phénytoïne', ARRAY['Di-Hydan', 'Phenytoin']),
('Halopéridol', ARRAY['Haldol', 'Haloperidol']),
('Chlorpromazine', ARRAY['Largactil', 'Chlorpromazine']),
('Amitriptyline', ARRAY['Laroxyl', 'Amitriptyline']),
('Fluoxétine', ARRAY['Prozac', 'Fluoxetine']),

-- Hormones / Contraception
('Lévonorgestrel + Ethinylestradiol', ARRAY['Microgynon', 'Trinordiol', 'Pilule']),
('Lévonorgestrel urgence', ARRAY['Norlevo', 'Plan B', 'Pilule du lendemain']),
('Medroxyprogesterone injectable', ARRAY['Depo-Provera', 'Depo provera']),
('Implant contraceptif', ARRAY['Nexplanon', 'Jadelle', 'Implanon']),
('Misoprostol', ARRAY['Cytotec', 'Misoprostol']),
('Ocytocine', ARRAY['Syntocinon', 'Oxytocin']),

-- Dermatologie
('Bétaméthasone crème', ARRAY['Diprosone', 'Betamethasone']),
('Hydrocortisone crème', ARRAY['Hydrocortisone', 'Cortisol']),
('Vaseline', ARRAY['Vaseline blanche', 'Pommade']),
('Perméthrine', ARRAY['Nix', 'Permethrine', 'Topiscab']),
('Benzyle benzoate', ARRAY['Ascabiol', 'Benzyl benzoate']),
('Acide salicylique', ARRAY['Salicylique', 'Acide salicylique']),

-- Ophtalmologie
('Chloramphénicol collyre', ARRAY['Cébemyxine', 'Chloramphenicol oeil']),
('Dexaméthasone collyre', ARRAY['Maxidex', 'Dexamethasone collyre']),
('Pilocarpine collyre', ARRAY['Pilocarpine', 'Isopto Pilocarpine']),
('Larmes artificielles', ARRAY['Refresh', 'Lacryvisc', 'Larmes']),

-- Anesthésiques locaux
('Lidocaïne', ARRAY['Xylocaine', 'Lidocaine']),
('Procaïne', ARRAY['Novocaine', 'Procaine']),

-- Urgences / Réanimation
('Adrénaline', ARRAY['Epinephrine', 'Adrenaline']),
('Atropine', ARRAY['Atropine sulfate']),
('Glucosé 10%', ARRAY['Glucose 10', 'Serum glucose']),
('Sérum physiologique', ARRAY['NaCl 0.9%', 'Chlorure de sodium', 'Serum sale']),
('Ringer Lactate', ARRAY['Lactate de Ringer', 'Hartmann']),

-- Antihelminthiques courants
('Praziquantel', ARRAY['Biltricide', 'Praziquantel'])
ON CONFLICT DO NOTHING;
