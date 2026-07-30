(function () {
  const DH = (globalThis.DH = globalThis.DH || {});

  // The long-form prose: shift briefings, the procedure binder and the console
  // checkout. Same [english, français] pairing as i18n.js, kept in its own file
  // because it is most of the words in the game.
  DH.I18N.add({
    // ================= scenarios ==========================================
    's.checkout.title': ['Console checkout', 'Prise en main de la console'],
    's.checkout.sub': ['Guided walkthrough of the control room', 'Visite guidée de la salle de commande'],
    's.checkout.teaches': ['Every board, every pane, and what the torch is for',
      'Chaque tableau, chaque volet, et à quoi sert la lampe'],
    's.checkout.brief': [[
      'A full power shift with nothing wrong, and a walkthrough of the console.',
      'It talks you through all five boards, the instruments that matter, the ones that lie, and every pane behind them.',
      'You do the moving. Steps that ask you to do something wait until you have done it, and you can skip out at any point.',
      'Nothing is simulated differently here. This is the same plant as every other shift.'
    ], [
      'Un quart à pleine puissance sans rien d’anormal, et une visite guidée de la console.',
      'Elle vous fait parcourir les cinq tableaux, les instruments qui comptent, ceux qui mentent, et tous les volets derrière.',
      'C’est vous qui agissez. Les étapes qui demandent une action attendent que vous l’ayez faite, et vous pouvez sortir quand vous voulez.',
      'Rien n’est simulé différemment ici. C’est la même tranche que pour tous les autres quarts.'
    ]],
    's.checkout.obj': [[
      'Learn where everything is',
      'Move rods and watch Doppler take the reactivity back',
      'Acknowledge an alarm and clear the condition that caused it',
      'Find the procedure binder, the recorder, the cameras and the telephone'
    ], [
      'Apprendre où se trouve chaque chose',
      'Déplacer les grappes et voir Doppler reprendre la réactivité',
      'Acquitter une alarme et supprimer la cause qui l’a provoquée',
      'Trouver le classeur, l’enregistreur, les caméras et le téléphone'
    ]],

    's.startup.title': ['Startup', 'Démarrage'],
    's.startup.sub': ['Hot standby to criticality', 'De l’arrêt à chaud à la criticité'],
    's.startup.teaches': ['Subcritical multiplication, doubling time, startup rate',
      'Multiplication sous-critique, temps de doublement, taux de montée'],
    's.startup.brief': [[
      'Unit is in hot standby. Rods on the bottom, boron at eleven forty.',
      'The outage crew finished at eight. You are taking her critical.',
      'Pull the shutdown banks first, then control bank D in small bites.',
      'Watch startup rate. One decade a minute is the limit and the trip is not far above it.'
    ], [
      'La tranche est en arrêt à chaud. Grappes en butée basse, bore à onze cent quarante.',
      'L’équipe d’arrêt a terminé à vingt heures. C’est vous qui la rendez critique.',
      'Extrayez d’abord les grappes d’arrêt, puis la grappe de régulation D par petites touches.',
      'Surveillez le taux de montée. Une décade par minute est la limite, et le seuil de déclenchement n’est pas loin au-dessus.'
    ]],
    's.startup.obj': [[
      'Withdraw the shutdown banks fully',
      'Take the reactor critical on control bank D',
      'Hold startup rate below 1.0 decade/min throughout',
      'Stabilise in the intermediate range without a trip'
    ], [
      'Extraire complètement les grappes d’arrêt',
      'Rendre le réacteur critique avec la grappe de régulation D',
      'Maintenir le taux de montée sous 1,0 décade/min du début à la fin',
      'Se stabiliser en gamme intermédiaire sans déclenchement'
    ]],

    's.ascension.title': ['Power ascension', 'Montée en puissance'],
    's.ascension.sub': ['Zero to full on the T-avg programme', 'De zéro à cent sur le programme T-moy'],
    's.ascension.teaches': ['Temperature programme, xenon building underneath you',
      'Le programme de température, avec le xénon qui monte sous vos pieds'],
    's.ascension.brief': [[
      'She is critical and in the intermediate range. Turbine is on the line at house load.',
      'Grid wants a hundred percent by four in the morning. Take her up on the temperature programme.',
      'Xenon is at zero and it will build all the way up. You will be pulling rods to stand still.',
      'Keep T-avg on T-ref. The deviation alarm is at three degrees and the dispatcher watches megawatts.'
    ], [
      'Elle est critique, en gamme intermédiaire. La turbine est couplée sur les auxiliaires.',
      'Le réseau veut cent pour cent pour quatre heures du matin. Montez sur le programme de température.',
      'Le xénon est à zéro et il va monter tout du long. Vous extrairez des grappes rien que pour rester sur place.',
      'Tenez T-moy sur T-réf. L’alarme d’écart est à trois degrés, et le dispatcheur regarde les mégawatts.'
    ]],
    's.ascension.obj': [[
      'Raise turbine load to 100% without exceeding the T-avg deviation band',
      'Compensate building xenon with rods and boron',
      'Keep axial flux difference inside the operating band',
      'Reach full power by 04:00'
    ], [
      'Monter la charge turbine à 100% sans sortir de la bande d’écart T-moy',
      'Compenser la montée du xénon avec les grappes et le bore',
      'Garder la différence de flux axial dans la bande d’exploitation',
      'Atteindre la pleine puissance pour 04:00'
    ]],

    's.loadfollow.title': ['Load follow', 'Suivi de charge'],
    's.loadfollow.sub': ['A hundred down to sixty and back', 'De cent à soixante, puis retour'],
    's.loadfollow.teaches': ['The xenon lesson, learned painfully', 'La leçon du xénon, apprise à la dure'],
    's.loadfollow.brief': [[
      'Full power, equilibrium xenon, everything on programme. Quiet night so far.',
      'Dispatcher will want you down to sixty percent at twenty three hundred for the overnight trough.',
      'He will want a hundred back by oh four hundred. Both of those are firm.',
      'The reactor will not simply come back. Think about what xenon is doing while you sit at sixty.'
    ], [
      'Pleine puissance, xénon à l’équilibre, tout sur programme. Nuit calme jusqu’ici.',
      'Le dispatcheur va vous demander de descendre à soixante pour cent à vingt-trois heures, pour le creux de nuit.',
      'Il voudra cent pour cent pour quatre heures. Les deux sont fermes.',
      'Le réacteur ne remontera pas tout seul. Réfléchissez à ce que fait le xénon pendant que vous restez à soixante.'
    ]],
    's.loadfollow.obj': [[
      'Reduce to 60% when the dispatcher asks',
      'Hold 60% without a trip while xenon peaks',
      'Return to 100% by 04:00',
      'Deliver the megawatt-hours the grid asked for'
    ], [
      'Descendre à 60% quand le dispatcheur le demande',
      'Tenir 60% sans déclenchement pendant le pic xénon',
      'Remonter à 100% pour 04:00',
      'Fournir les mégawattheures demandés par le réseau'
    ]],
    's.loadfollow.call0': [[
      'Control room, dispatch.',
      'We are into the overnight trough. Bring her back to sixty percent for me, any time in the next half hour.',
      'Back to a hundred by oh four hundred. Firm.'
    ], [
      'Salle de commande, ici le dispatching.',
      'On entre dans le creux de nuit. Ramenez-la à soixante pour cent, quand vous voulez dans la demi-heure.',
      'Retour à cent pour quatre heures. C’est ferme.'
    ]],
    's.loadfollow.call1': [[
      'Dispatch again.',
      'Morning pickup is early. We need a hundred percent by oh four hundred.',
      'Tell me now if you cannot make it.'
    ], [
      'Le dispatching à nouveau.',
      'La reprise du matin est en avance. Il nous faut cent pour cent à quatre heures.',
      'Dites-le-moi maintenant si vous ne pouvez pas y arriver.'
    ]],

    's.cleantrip.title': ['Clean trip', 'Arrêt d’urgence propre'],
    's.cleantrip.sub': ['Scram and stabilise on decay heat', 'Déclencher et se stabiliser sur la puissance résiduelle'],
    's.cleantrip.teaches': ['The baseline. Where forty megawatts goes with the reactor off',
      'Le cas de base. Où passent quarante mégawatts réacteur arrêté'],
    's.cleantrip.brief': [[
      'Full power. Nothing wrong with the plant.',
      'The turbine hall has a problem coming and you are going to lose the condenser.',
      'When it goes, trip the reactor and put her on the steam generators.',
      'Stable is T-avg at two ninety two, pressure at fifteen and a half, levels on programme. Get there and hold it.'
    ], [
      'Pleine puissance. Rien d’anormal sur la tranche.',
      'La salle des machines a un problème qui arrive, et vous allez perdre le condenseur.',
      'Quand il lâchera, déclenchez le réacteur et passez sur les générateurs de vapeur.',
      'Stable, c’est T-moy à deux cent quatre-vingt-douze, pression à quinze et demi, niveaux sur programme. Allez-y et tenez.'
    ]],
    's.cleantrip.obj': [[
      'Trip the reactor when the condenser is lost',
      'Establish decay heat removal through the steam generators',
      'Hold T-avg near 292 C and pressurizer pressure near 15.5 MPa',
      'Keep steam generator levels in the narrow range'
    ], [
      'Déclencher le réacteur à la perte du condenseur',
      'Établir l’évacuation de la puissance résiduelle par les générateurs de vapeur',
      'Tenir T-moy vers 292 C et la pression pressuriseur vers 15,5 MPa',
      'Garder les niveaux GV dans la gamme étroite'
    ]],

    's.lofw.title': ['Loss of feedwater', 'Perte de l’alimentation en eau'],
    's.lofw.sub': ['Auxiliary feedwater available', 'Alimentation de secours disponible'],
    's.lofw.teaches': ['The heat sink, and how fast a steam generator boils dry',
      'La source froide, et la vitesse à laquelle un GV se vide'],
    's.lofw.brief': [[
      'Full power. Both main feed pumps are on the line.',
      'Nothing to do but watch the boards until something happens.',
      'If you lose feedwater the generators have about ninety seconds of water in them at full power.',
      'Auxiliary feedwater is lined up and should start on its own.'
    ], [
      'Pleine puissance. Les deux pompes alimentaires principales sont en service.',
      'Rien à faire que surveiller les tableaux jusqu’à ce qu’il se passe quelque chose.',
      'Si vous perdez l’alimentation, les générateurs ont environ quatre-vingt-dix secondes d’eau à pleine puissance.',
      'L’alimentation de secours est alignée et devrait démarrer toute seule.'
    ]],
    's.lofw.obj': [[
      'Recognise the loss of main feedwater',
      'Confirm auxiliary feedwater started and is feeding all four generators',
      'Keep the core covered and subcooled',
      'Stabilise on natural or forced circulation with the generators as the heat sink'
    ], [
      'Reconnaître la perte de l’alimentation normale',
      'Confirmer que l’ASG a démarré et alimente les quatre générateurs',
      'Garder le cœur couvert et sous-refroidi',
      'Se stabiliser en circulation naturelle ou forcée avec les GV comme source froide'
    ]],

    's.lofw-shut.title': ['Loss of feedwater, valves shut', 'Perte d’alimentation, vannes fermées'],
    's.lofw-shut.sub': ['The actual opening of Three Mile Island', 'L’ouverture réelle de Three Mile Island'],
    's.lofw-shut.teaches': ['You cannot see a locked-shut valve from a chair',
      'On ne voit pas une vanne condamnée fermée depuis son fauteuil'],
    's.lofw-shut.brief': [[
      'Full power. Maintenance was in the aux feed pump room earlier in the shift.',
      'Their tags came off the board at shift turnover. Everything indicated normal.',
      'Auxiliary feedwater pumps will start when they are called. That is not the same as flow.',
      'You have one man in the plant and a telephone.'
    ], [
      'Pleine puissance. La maintenance est intervenue au local ASG en début de quart.',
      'Leurs étiquettes ont été retirées du tableau à la relève. Tout indiquait normal.',
      'Les pompes ASG démarreront quand on les appellera. Ce n’est pas la même chose qu’avoir du débit.',
      'Vous avez un agent en tranche et un téléphone.'
    ]],
    's.lofw-shut.obj': [[
      'Recognise that auxiliary feedwater pumps are running with no flow',
      'Dispatch the auxiliary operator to the AFW pump room',
      'Restore feedwater flow before the generators boil dry',
      'Keep the core covered'
    ], [
      'Reconnaître que les pompes ASG tournent sans débit',
      'Envoyer l’agent de terrain au local des pompes ASG',
      'Rétablir le débit avant que les générateurs ne se vident',
      'Garder le cœur couvert'
    ]],

    's.porv.title': ['Stuck-open PORV', 'Soupape de décharge bloquée ouverte'],
    's.porv.sub': ['The rest of Three Mile Island', 'La suite de Three Mile Island'],
    's.porv.teaches': ['Pressurizer level is not inventory. Subcooling margin is the only honest tell',
      'Le niveau pressuriseur n’est pas l’inventaire. La marge de sous-refroidissement est le seul indice honnête'],
    's.porv.brief': [[
      'Full power. Same plant, same shift, one more failure.',
      'A relief valve that lifts is normal. A relief valve that does not reseat is not, and it does not tell you.',
      'Position indication on that valve shows the demand signal, not the disc.',
      'If the pressurizer reads full and pressure keeps falling, believe the pressure.'
    ], [
      'Pleine puissance. Même tranche, même quart, une défaillance de plus.',
      'Une soupape qui s’ouvre, c’est normal. Une soupape qui ne se referme pas, non — et elle ne vous le dira pas.',
      'L’indication de position de cette soupape montre le signal de commande, pas le clapet.',
      'Si le pressuriseur indique plein et que la pression continue de descendre, croyez la pression.'
    ]],
    's.porv.obj': [[
      'Diagnose that the pressurizer PORV has not reseated',
      'Shut the PORV block valve',
      'Keep subcooling margin above zero and the core covered',
      'Do not throttle safety injection while the core is saturated'
    ], [
      'Diagnostiquer que la soupape du pressuriseur ne s’est pas refermée',
      'Fermer la vanne d’isolement de la soupape',
      'Garder la marge de sous-refroidissement positive et le cœur couvert',
      'Ne pas réduire l’injection de sécurité tant que le cœur est saturé'
    ]],

    's.sbloca.title': ['Small-break LOCA', 'APRP petite brèche'],
    's.sbloca.sub': ['Diagnosis by elimination', 'Diagnostic par élimination'],
    's.sbloca.teaches': ['Telling a leak from a cooldown from a relief valve',
      'Distinguer une fuite, un refroidissement et une soupape ouverte'],
    's.sbloca.brief': [[
      'Full power, everything on programme.',
      'A leak, a stuck relief valve and an excessive cooldown all look the same on the pressure gauge.',
      'They do not look the same on the relief tank, the containment, or the charging pump.',
      'Work out which one you have before you decide what to do about it.'
    ], [
      'Pleine puissance, tout sur programme.',
      'Une fuite, une soupape bloquée et un refroidissement excessif se ressemblent tous sur le manomètre.',
      'Ils ne se ressemblent pas sur le réservoir de décharge, l’enceinte ou la pompe de charge.',
      'Déterminez lequel vous avez avant de décider quoi en faire.'
    ]],
    's.sbloca.obj': [[
      'Distinguish a coolant leak from a relief valve or a secondary cooldown',
      'Let safety injection do its job',
      'Keep the core covered through the depressurisation',
      'Get to the point where injection matches the break'
    ], [
      'Distinguer une fuite primaire d’une soupape ouverte ou d’un refroidissement secondaire',
      'Laisser l’injection de sécurité faire son travail',
      'Garder le cœur couvert pendant la dépressurisation',
      'Arriver au point où l’injection compense la brèche'
    ]],

    's.sgtr.title': ['Steam generator tube rupture', 'Rupture de tube de générateur de vapeur'],
    's.sgtr.sub': ['A leak with a path to the sky', 'Une fuite avec un chemin vers l’extérieur'],
    's.sgtr.teaches': ['The correct response feels wrong: cool down and depressurize',
      'La bonne réponse semble fausse : refroidir et dépressuriser'],
    's.sgtr.brief': [[
      'Full power. Steam generator two has been showing a slow rise on the condenser air ejector monitor all week.',
      'Chemistry called it instrument drift.',
      'If a tube goes, the primary has a path to the atmosphere through that generator.',
      'Everything you would normally do to a leak makes this one worse.'
    ], [
      'Pleine puissance. Le générateur de vapeur deux montre une lente montée sur la balise d’éjecteur d’air depuis une semaine.',
      'La chimie a conclu à une dérive d’instrument.',
      'Si un tube lâche, le primaire a un chemin vers l’atmosphère par ce générateur.',
      'Tout ce que vous feriez normalement pour une fuite aggrave celle-ci.'
    ]],
    's.sgtr.obj': [[
      'Identify which steam generator is leaking',
      'Isolate the ruptured generator',
      'Cool down and depressurize the primary to stop the leak',
      'Minimise radioactivity released to the environment'
    ], [
      'Identifier quel générateur de vapeur fuit',
      'Isoler le générateur rompu',
      'Refroidir et dépressuriser le primaire pour arrêter la fuite',
      'Minimiser les rejets radioactifs à l’environnement'
    ]],

    's.sbo.title': ['Station blackout', 'Perte totale des alimentations électriques'],
    's.sbo.sub': ['Diesels, then batteries, then nothing', 'Les diesels, puis les batteries, puis plus rien'],
    's.sbo.teaches': ['Fukushima’s shape. Where the flashlight earns its place',
      'La forme de Fukushima. Là où la lampe torche justifie sa place'],
    's.sbo.brief': [[
      'Full power. There is weather on the four hundred kilovolt line and the switchyard has been noisy all night.',
      'If you lose the grid the reactor coolant pumps go with it. They are not on the diesels.',
      'Diesel one has been troublesome since the last surveillance.',
      'The turbine-driven aux feed pump does not need alternating current. It does need the batteries.'
    ], [
      'Pleine puissance. Il y a de l’orage sur la ligne quatre cents kilovolts et le poste est bruyant depuis le début de la nuit.',
      'Si vous perdez le réseau, les pompes primaires partent avec. Elles ne sont pas sur les diesels.',
      'Le diesel un fait des siennes depuis le dernier essai périodique.',
      'La turbopompe ASG n’a pas besoin de courant alternatif. Elle a besoin des batteries.'
    ]],
    's.sbo.obj': [[
      'Establish natural circulation after the pumps coast down',
      'Get at least one diesel generator back',
      'Keep the turbine-driven auxiliary feedwater pump feeding',
      'Shed DC load before the batteries go'
    ], [
      'Établir la circulation naturelle après le ralentissement des pompes',
      'Récupérer au moins un groupe électrogène',
      'Maintenir l’alimentation par la turbopompe ASG',
      'Délester le continu avant que les batteries ne lâchent'
    ]],

    's.xenon.title': ['Xenon-precluded startup', 'Redémarrage empêché par le xénon'],
    's.xenon.sub': ['The grid wants power now', 'Le réseau veut de la puissance tout de suite'],
    's.xenon.teaches': ['Recognising that the answer is no', 'Savoir reconnaître que la réponse est non'],
    's.xenon.brief': [[
      'You tripped four hours ago. Xenon has been building ever since and it is nowhere near its peak.',
      'The dispatcher does not know what xenon is and does not care.',
      'Pull the banks if you like. Watch the count rate and the reactivity balance.',
      'The skill being tested here is knowing when to say no, and being able to show the arithmetic.'
    ], [
      'Vous avez déclenché il y a quatre heures. Le xénon monte depuis, et il est loin de son pic.',
      'Le dispatcheur ne sait pas ce qu’est le xénon et s’en moque.',
      'Extrayez les grappes si vous voulez. Surveillez le taux de comptage et le bilan de réactivité.',
      'Ce qui est évalué ici, c’est de savoir dire non, et de pouvoir montrer le calcul.'
    ]],
    's.xenon.obj': [[
      'Withdraw the banks and observe subcritical multiplication',
      'Read the xenon worth off the reactivity balance',
      'Recognise that available rod worth cannot overcome it',
      'Do not attempt a criticality you cannot control'
    ], [
      'Extraire les grappes et observer la multiplication sous-critique',
      'Lire l’antiréactivité xénon sur le bilan de réactivité',
      'Reconnaître que l’efficacité des grappes disponible ne peut pas la compenser',
      'Ne pas tenter une criticité que vous ne maîtrisez pas'
    ]],
    's.xenon.call0': [[
      'Control room, this is dispatch.',
      'You tripped at twenty two hundred. It is now oh two hundred and we are short eleven hundred megawatts on the morning ramp.',
      'What is your restart time?'
    ], [
      'Salle de commande, ici le dispatching.',
      'Vous avez déclenché à vingt-deux heures. Il est deux heures et il nous manque onze cents mégawatts sur la montée du matin.',
      'Quel est votre délai de redémarrage ?'
    ]],
    's.xenon.call1': [[
      'Dispatch called me at home.',
      'I told him the same thing you are about to tell him, but I want to hear you say it with numbers.',
      'How much reactivity are you short, and when does it come back?'
    ], [
      'Le dispatching m’a appelé chez moi.',
      'Je lui ai dit la même chose que vous allez lui dire, mais je veux vous l’entendre dire avec des chiffres.',
      'Combien de réactivité vous manque-t-il, et quand revient-elle ?'
    ]],
    's.xenon.mgr': ['SHIFT MANAGER', 'CHEF D’EXPLOITATION'],

    's.ejection.title': ['Rod ejection', 'Éjection de grappe'],
    's.ejection.sub': ['Prompt criticality, terminated before you can move',
      'Criticité prompte, arrêtée avant que vous ne puissiez bouger'],
    's.ejection.teaches': ['Doppler is faster than any human being', 'Doppler est plus rapide que n’importe quel humain'],
    's.ejection.brief': [[
      'Sixty percent, holding for the overnight trough.',
      'A control rod drive mechanism housing is going to fail and the differential pressure will fire one rod out of the core.',
      'It will be over before you have finished turning your head.',
      'What you are graded on is what you do in the ten minutes afterwards.'
    ], [
      'Soixante pour cent, maintenu pour le creux de nuit.',
      'Le carter d’un mécanisme de commande de grappe va rompre, et la pression différentielle va éjecter une grappe hors du cœur.',
      'Ce sera terminé avant que vous ayez fini de tourner la tête.',
      'Ce sur quoi vous êtes noté, c’est ce que vous faites dans les dix minutes qui suivent.'
    ]],
    's.ejection.obj': [[
      'Survive the excursion with fuel and clad intact',
      'Verify the trip and the rod bottom lights',
      'Check for fuel damage on the containment and letdown monitors',
      'Stabilise on decay heat'
    ], [
      'Passer l’excursion avec le combustible et les gaines intacts',
      'Vérifier le déclenchement et les voyants de grappes en butée basse',
      'Rechercher un endommagement du combustible sur les balises enceinte et décharge',
      'Se stabiliser sur la puissance résiduelle'
    ]],

    's.atws.title': ['ATWS', 'ATWS'],
    's.atws.sub': ['The transient where the scram does not work',
      'Le transitoire où l’arrêt d’urgence ne fonctionne pas'],
    's.atws.teaches': ['Boron, and the moderator coefficient you were given',
      'Le bore, et le coefficient modérateur qu’on vous a donné'],
    's.atws.brief': [[
      'Full power, beginning of cycle. Boron is high and the moderator coefficient is close to zero.',
      'That means the plant will not shut itself down when the heat sink goes away.',
      'The rods are going to fail to insert. The trip breakers will open and nothing will move.',
      'You have manual rod insertion, emergency boration, and the time the pressure vessel gives you.'
    ], [
      'Pleine puissance, début de cycle. Le bore est élevé et le coefficient modérateur est proche de zéro.',
      'Autrement dit, la tranche ne s’arrêtera pas d’elle-même quand la source froide disparaîtra.',
      'Les grappes ne vont pas chuter. Les disjoncteurs vont s’ouvrir et rien ne bougera.',
      'Vous avez l’insertion manuelle, la boration de secours, et le temps que la cuve vous laisse.'
    ]],
    's.atws.obj': [[
      'Recognise that the rods have not inserted',
      'Drive rods in manually',
      'Start emergency boration',
      'Keep RCS pressure below the safety valve capacity and the core covered'
    ], [
      'Reconnaître que les grappes ne sont pas descendues',
      'Insérer les grappes manuellement',
      'Démarrer la boration de secours',
      'Tenir la pression primaire sous la capacité des soupapes et garder le cœur couvert'
    ]]
  });
})();
