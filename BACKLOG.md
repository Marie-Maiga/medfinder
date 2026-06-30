# MedFinder — Backlog

## Priorité haute

### Fallback automatique (2 tours)
Quand toutes les pharmacies du premier lot sont indisponibles ou n'ont pas répondu avant le timeout, relancer automatiquement vers les 3 prochaines pharmacies les plus proches (non déjà contactées). Maximum 2 tours (6 pharmacies total).
- Marquer la demande `escalated` entre les tours
- Prévenir le patient : "Nous cherchons d'autres pharmacies, patientez…"
- Si toujours aucun résultat après 2 tours → envoyer "Aucune pharmacie disponible"
- Stocker `excluded_pharmacy_ids` sur la demande pour éviter les doublons

### Disponibilité partielle (3e bouton WhatsApp)
Ajouter un bouton "Partiel / Équivalent" aux messages envoyés aux pharmacies.
- La pharmacie clique → MedFinder répond "Merci, précisez ce qui est disponible"
- On capture la réponse texte, affichée dans le dashboard
- Le patient reçoit les coordonnées avec la mention "disponibilité partielle"

### Base de médicaments + autocomplétion
Créer une table `medicines` avec les noms courants (DCI + noms commerciaux).
- Autocomplétion dans le formulaire de création de demande
- Normalisation des noms saisis (évite "paracetamol" / "Paracétamol" / "doliprane")
- Seeder initial avec les médicaments les plus courants au Niger

---

## Priorité moyenne

### Interface patient web
Page publique (sans login) où le patient saisit son quartier + médicaments et reçoit les résultats sur WhatsApp. Les opérateurs restent pour les patients non-numériques.

### Vérification numéros WhatsApp des vraies pharmacies
Les 147 pharmacies ont des numéros à vérifier/mettre à jour pour la production.

---

## Priorité basse / Production

### Meta Business Verification
Pour lever la restriction d'envoi (actuellement seuls les numéros whitelistés reçoivent les messages). Nécessite documents légaux MedFinder.

### n8n automations
Rapport quotidien, alertes si aucune réponse de pharmacie, etc. À faire après stabilisation.

---

## Fait ✅
- Auth (email/password), rôles admin/operator
- 147 pharmacies réelles de Niamey seedées
- Création demande + scoring/dispatch pharmacies
- Messages WhatsApp interactifs (boutons) vers pharmacies
- Webhook réponses pharmacies (bouton + texte fallback)
- Résultats envoyés au patient WhatsApp
- Page settings admin
- Dashboard analytique (KPIs, top médicaments, top pharmacies)
- Meta app publiée (Live mode), WABA abonné
- Token WhatsApp permanent
- UI temps réel sans refresh (Supabase Realtime)
- Timer s'arrête quand toutes les pharmacies ont répondu
- Skeleton loading pour navigation sidebar
- Finalisation automatique des demandes en timeout (lazy + cron)
