-- Seed quartiers de Niamey
INSERT INTO neighborhoods (name, city, centroid_lat, centroid_lng) VALUES
  ('Plateau',        'Niamey', 13.5137, 2.1177),
  ('Nouveau Marché', 'Niamey', 13.5167, 2.1056),
  ('Kalley',         'Niamey', 13.5089, 2.1100),
  ('Terminus',       'Niamey', 13.5042, 2.1183),
  ('Liberté',        'Niamey', 13.5200, 2.1033),
  ('Yantala',        'Niamey', 13.5278, 2.0928),
  ('Boukoki',        'Niamey', 13.5356, 2.0861),
  ('Saga',           'Niamey', 13.4833, 2.1500),
  ('Gamkalé',        'Niamey', 13.4778, 2.1056),
  ('Banizoumbou',    'Niamey', 13.4933, 2.0850),
  ('Koira Kano',     'Niamey', 13.5044, 2.0722),
  ('Dar Es Salam',   'Niamey', 13.5178, 2.0611),
  ('Talladjé',       'Niamey', 13.5311, 2.1033),
  ('Lazaret',        'Niamey', 13.5033, 2.1389),
  ('Aéroport',       'Niamey', 13.4811, 2.1694),
  ('Pays Bas',       'Niamey', 13.5344, 2.1172),
  ('Rive droite',    'Niamey', 13.5222, 2.1539),
  ('Recasement',     'Niamey', 13.5067, 2.0944),
  ('Saguia',         'Niamey', 13.5389, 2.0778),
  ('Goudel',         'Niamey', 13.4944, 2.1639),
  ('Niamey Centre',  'Niamey', 13.5117, 2.1122)
ON CONFLICT (name) DO NOTHING;

-- Médicaments courants
INSERT INTO medicines (name, aliases) VALUES
  ('Amoxicilline 500mg',              ARRAY['Clamoxyl 500mg']),
  ('Amoxicilline + Acide clavulanique 1g', ARRAY['Augmentin 1g', 'Amoxiclav 1g']),
  ('Paracétamol 1000mg',              ARRAY['Doliprane 1000mg', 'Efferalgan 1g', 'Dafalgan 1g']),
  ('Paracétamol 500mg',               ARRAY['Doliprane 500mg', 'Efferalgan 500mg']),
  ('Salbutamol 100µg',                ARRAY['Ventoline', 'Salbutamol spray']),
  ('Ibuprofène 400mg',                ARRAY['Advil 400mg', 'Nurofen 400mg']),
  ('Métronidazole 500mg',             ARRAY['Flagyl 500mg']),
  ('Cotrimoxazole 480mg',             ARRAY['Bactrim 480mg', 'Septrin']),
  ('Artéméther + Luméfantrine',       ARRAY['Coartem', 'Lumartem']),
  ('Quinine 500mg',                   ARRAY['Quinine sulfate 500mg']),
  ('Oméprazole 20mg',                 ARRAY['Mopral 20mg', 'Losec 20mg']),
  ('Amlodipine 5mg',                  ARRAY['Amlor 5mg', 'Norvasc 5mg']),
  ('Metformine 500mg',                ARRAY['Glucophage 500mg']),
  ('Zinc 20mg',                       ARRAY['Zincovit', 'Zinc sulfate 20mg']),
  ('Sels de Réhydratation Orale',     ARRAY['SRO', 'ORS'])
ON CONFLICT (name) DO NOTHING;
