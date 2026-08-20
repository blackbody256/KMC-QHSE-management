const SYSTEM = 'HEALTH AND WELLNESS MANAGEMENT SYSTEM';

module.exports = {
  slug: 'hwms-architecture',
  filename: 'HWMS Architecture Document.docx',
  meta: {
    system: SYSTEM,
    title: 'Architecture Document',
    reference: 'KMC.DQHSE.08/26-SP002',
    description: 'Technical architecture of the Health and Wellness Management System covering service topology, data ownership, identity, deployment and the decisions behind them',
    preparedBy: 'Akanga Andrew, Software Engineering Intern, Department of Quality, Health, Safety and Environment',
    issueDate: '11/08/2026',
    version: '002',
    classification: 'Internal, Restricted to KMC ICT and the Department of Quality, Health, Safety and Environment',
  },

  build(d, L) {
    const b = [];
    const p = (t) => b.push(L.para(t));
    const bl = (t) => b.push(L.bullet(t));

    // ------------------------------------------------------------------ 1
    b.push(L.h1(d, 'Introduction'));

    b.push(L.h2(d, 'Purpose'));
    p('This document describes how the Health and Wellness Management System is built. It is written for KMC ICT, who will host the system and later maintain it, and for whoever inherits the code. It records not only what the structure is but why it was chosen, so that a future maintainer can tell a deliberate decision from an accident.');

    b.push(L.h2(d, 'Guiding Constraints'));
    p('Four constraints shaped the architecture more than any preference did.');
    bl('Clinical data is special personal data under the Data Protection and Privacy Act, 2019, and the separation protecting it must be structural rather than procedural.');
    bl('Microservices are the architectural standard of the Corporation, following the precedent set by the Velo system.');
    bl('KMC ICT works in Go, so the backend is written in Go.');
    bl('The system was built by one intern whose attachment is ending, so operational complexity that a small team cannot carry is itself a defect.');

    b.push(L.h2(d, 'Technology'));
    const t13 = L.tableCaption(d, 'Technology Choices and Their Reasons');
    b.push(t13.paragraph);
    b.push(L.table(
      ['Layer', 'Choice', 'Reason'],
      [
        ['Backend', 'Go with the chi router', 'Matches the standard KMC ICT works in. Single binary deployment suits on premise hosting'],
        ['Persistence', 'PostgreSQL 16', 'Mature, well understood, and supports the separation the clinical context requires'],
        ['Identity', 'Keycloak', 'Provides password policy, lockout, multi factor and later corporate single sign on without application code'],
        ['Interface', 'React with TypeScript', 'Matches the reviewed prototype, so the approved design carries across unchanged'],
        ['Observability', 'Prometheus and Grafana', 'Operational monitoring for ICT, separate from the divisional dashboard'],
        ['Local environment', 'Docker Compose', 'One command brings the whole system up on a laptop'],
        ['Deployment target', 'Kubernetes manifests for k3s', 'Written in parallel so production is a deployment change rather than a rewrite'],
      ],
      [1800, 2600, 5000],
    ));

    // ------------------------------------------------------------------ 2
    b.push(L.h1(d, 'Service Topology'));

    b.push(L.h2(d, 'Overview'));
    p('The system is a set of independently deployable services, one per bounded context, behind a single gateway. Each owns its own database and exposes its data only through its own interface.');
    b.push(...L.figure(d, 'hwms-architecture', 'Service Topology and Request Path'));
    b.push(L.richPara([
      'The clinical service shown in ',
      { ref: 'fig_2_1', cached: 'Figure 2.1' },
      ' is the only workload issued a credential for the clinical database. That is not a deployment preference. It is the mechanism that makes the access rule structural, because a defect in another service cannot read a patient record when it holds nothing with which to try.',
    ]));

    const t21 = L.tableCaption(d, 'Services and What Each Owns');
    b.push(t21.paragraph);
    b.push(L.table(
      ['Service', 'Owns', 'Special Conditions'],
      [
        ['Gateway', 'Sign in exchange, session, routing to services', 'Holds no data and no business rule'],
        ['Identity', 'Account administration and the administrative audit trail', 'Acts on Keycloak through its own service account, never the user token'],
        ['Clinical', 'Patients, visits, laboratory requisitions and referrals', 'Separate database instance, separate credentials, separate key'],
        ['Web', 'The single public origin, serving the interface', 'Proxies the sign in and interface paths to the gateway'],
      ],
      [1600, 4200, 3600],
    ));
    p('Two further services are specified and not yet built. Occupational, covering ergonomics and industrial hygiene, and metrics, covering monthly returns and indicator computation. They are named here because their boundaries are already decided and the interface already routes to them.');

    b.push(L.h2(d, 'Why Not a Single Application'));
    p('An earlier draft of this architecture chose a modular monolith. The reasoning was a small user population, no independently scaling workload and a single maintainer, and on those grounds it was correct.');
    p('That decision was superseded for two reasons. The Corporation stated microservices as its standard, and alignment with that standard is a precondition of ICT accepting the system. More importantly, the split strengthens the property that matters most here. Under a single application the rule that only the clinical context holds clinical credentials was enforced by code review, because every context ran in one process with one configuration. Under this arrangement it is enforced by deployment.');
    p('The cost is real and is stated plainly. There are more moving parts to run than a single application would require, and that cost lands on whoever maintains the system after handover. Section 6 sets out the specific measures that hold it down.');

    b.push(L.h2(d, 'Communication'));
    p('Services communicate over HTTP with JSON. The gateway attaches a bearer token to every proxied call, and each service validates that token independently rather than trusting the gateway to have done so.');
    p('One communication rule is not negotiable. No service other than the clinical service reads a clinical record. Where another context requires clinical information it receives counts and non identifying facts, never records. A reporting service therefore receives the number of visits in a period and never the visits themselves.');

    // ------------------------------------------------------------------ 3
    b.push(L.h1(d, 'Identity and Session'));

    b.push(L.h2(d, 'The Backend for Frontend Pattern'));
    p('The browser never holds a token. The gateway completes the sign in exchange with Keycloak, keeps the resulting tokens in server side session state, and returns to the browser an opaque session identifier in a cookie marked HttpOnly, Secure and SameSite.');
    p('This is the single most consequential decision in the identity design. In a system that holds health data, a token readable by any script on the page is not acceptable, and that risk is what the gateway exists to remove. A consequence worth stating is that the browser cannot call a service directly, so every authenticated call passes through one place where it can be inspected.');

    b.push(L.h2(d, 'Roles'));
    p('Roles are held in Keycloak and carried on the access token. The interface reads them to decide what to render, and every service checks them again to decide what to permit. The interface hiding a control is a courtesy. Refusing the request is the control.');
    const t31 = L.tableCaption(d, 'Roles as Held in the Identity Provider');
    b.push(t31.paragraph);
    b.push(L.table(
      ['Role', 'Purpose', 'Clinical Scope'],
      [
        ['hwms-officer', 'Health and Wellness Officer, the clinical role', 'Yes, and it is the only role that carries it'],
        ['hwms-manager', 'Read only operations, plus account administration', 'No'],
        ['hwms-director', 'Read only executive summaries', 'No'],
      ],
      [2200, 5200, 2400],
    ));
    p('Roles are read from the access token rather than the identity token. Keycloak places realm roles on the access token and by default leaves them off the identity token entirely, so reading them from the identity token yields an empty set and signs a user in with no role and no navigation. That failure occurred once during build and is now covered by an automated test. Taking roles from the access token also keeps the gateway view of a caller identical to what the services enforce on, since that is the token forwarded to them.');

    b.push(L.h2(d, 'Account Administration'));
    p('The manager creates officer and director accounts through the identity service. The manager token is never used to administer the identity provider. The service authorises the manager and then acts through its own service account, so a stolen manager token cannot create accounts directly.');
    p('The manager cannot grant the manager role. Account administration expands only by a decision taken outside that screen, which limits what a single mistaken or compromised manager session can do. Every creation, enabling and disabling is written to the audit trail.');

    // ------------------------------------------------------------------ 4
    b.push(L.h1(d, 'Data'));

    b.push(L.h2(d, 'Ownership Rules'));
    const t41 = L.tableCaption(d, 'Data Ownership Rules');
    b.push(t41.paragraph);
    b.push(L.table(
      ['Rule', 'Statement'],
      [
        ['One database per service', 'A service reads and writes its own database and no other'],
        ['Clinical separation', 'The clinical database is a separate instance with separate credentials and a separate encryption key'],
        ['No cross context join', 'A reference across a context boundary is an identifier with no foreign key. Integrity across boundaries is an application concern'],
        ['Soft deletion', 'A record that has been referenced is marked deleted rather than removed'],
        ['Versioned change', 'Schema change is applied through numbered migration files held in source control and applied at startup'],
        ['Append only logs', 'The audit trail and the clinical access log accept inserts and reads only, enforced by the database role'],
      ],
      [2600, 7000],
    ));

    b.push(L.h2(d, 'The Clinical Schema'));
    p('The clinical context holds five tables. Patients, visits, the state and content of each section of a visit, laboratory requisitions with the investigations requested against them, and the clinical access log.');
    p('Section state is stored alongside section content rather than inferred from whether content exists. That is what allows the record to distinguish a section nobody has touched from one the officer decided does not apply, which is the distinction that makes a partially completed record auditable.');
    p('Vital signs are held as a document rather than as columns. The set is stable but sparsely populated, because a minor complaint records none of it, and twelve mostly empty columns model that worse than one document does.');

    b.push(L.h2(d, 'Snapshots on Forms'));
    p('A laboratory requisition and a referral each carry a snapshot of the patient information printed on them, taken when the form was raised. A later correction to the registry does not rewrite a form that has already gone to the laboratory or to a receiving facility. The printed sheet and the stored record continue to agree.');

    // ------------------------------------------------------------------ 5
    b.push(L.h1(d, 'Deployment'));

    b.push(L.h2(d, 'Environments'));
    p('Three environments are defined. A local environment brought up by one command on a developer machine, a user testing environment on KMC controlled infrastructure holding synthetic data only, and a production environment that has not been requested and is not covered by this document.');
    b.push(...L.figure(d, 'hwms-uat-environment', 'Separation Between User Testing and Production'));
    b.push(L.richPara([
      'The separation in ',
      { ref: 'fig_5_1', cached: 'Figure 5.1' },
      ' is a requirement rather than a convention. No real clinical record is copied into a testing environment at any point.',
    ]));

    b.push(L.h2(d, 'Production Considerations'));
    const t51 = L.tableCaption(d, 'Deployment Constraints for Production');
    b.push(t51.paragraph);
    b.push(L.table(
      ['Constraint', 'Detail'],
      [
        ['Gateway replicas', 'The gateway runs as a single replica until its session store is shared. Two replicas would not share sessions and users would appear to be signed out at random'],
        ['Secrets', 'No credential is held in the repository. Values are supplied by ICT from a controlled source. Development defaults must never reach a cluster'],
        ['Clinical database isolation', 'A network policy permits only the clinical service to open a connection to the clinical database, so that even a leaked credential is not reachable'],
        ['Transport', 'Encryption terminates at the ingress. Session cookies are marked secure wherever transport encryption is present'],
        ['Backups', 'Nightly encrypted backup with the clinical backup under a separate key, and a restore tested quarterly'],
        ['Orchestration', 'Kubernetes manifests are provided for k3s. If ICT prefers another arrangement the manifests are discarded and nothing else changes'],
      ],
      [2600, 7000],
    ));

    b.push(L.h2(d, 'Observability'));
    p('Each service exposes operational metrics which Prometheus collects and Grafana presents. Route templates are used as metric labels, so one address serves as one series rather than one per patient. That is a privacy rule and a practical one at the same time, since identifiers as labels would also make the metrics database unusable.');
    p('No clinical content reaches any log line, metric label or trace. Grafana is for operating the system and is not a second route to divisional data. No dashboard there queries clinical data and none reproduces an indicator.');

    // ------------------------------------------------------------------ 6
    b.push(L.h1(d, 'Maintainability'));
    p('A service per context is only maintainable by a small team if the cost of an additional service is close to zero. Six measures keep it there and none of them is optional.');
    const t61 = L.tableCaption(d, 'Measures That Keep the Topology Maintainable');
    b.push(t61.paragraph);
    b.push(L.table(
      ['Measure', 'Detail'],
      [
        ['One repository', 'All services, the interface, the deployment manifests and the migrations sit together. A change spanning services is one commit and one review'],
        ['One shared library', 'Configuration, logging, health, metrics, database access, migrations and token validation are written once and imported'],
        ['One service skeleton', 'A new service is the skeleton plus its domain code. A service that reimplements the shared library has diverged'],
        ['One pipeline', 'The same build and test path serves every service'],
        ['One local command', 'The whole system starts on a laptop with a single command, so a new joiner is productive the same day'],
        ['One test that blocks merges', 'The clinical access suite runs on every build and fails the build if any role other than the officer reaches a clinical route'],
      ],
      [2400, 7200],
    ));

    b.push(L.h2(d, 'Known Limitations'));
    const t62 = L.tableCaption(d, 'Known Limitations and Their Consequences');
    b.push(t62.paragraph);
    b.push(L.table(
      ['Limitation', 'Consequence', 'Resolution'],
      [
        ['Session state is held in the gateway process', 'One replica only. A restart signs everybody out', 'Move the session store behind the existing interface to a shared store'],
        ['Development secrets are in the repository', 'Acceptable on a laptop, unacceptable anywhere else', 'Supplied by ICT from a controlled source before any deployment'],
        ['No continuous integration pipeline', 'Nothing enforces the build and tests on merge', 'Configure once a KMC source control remote exists'],
        ['Logs and traces are not aggregated', 'Diagnosis requires reading each service in turn', 'Add log and trace collection alongside the existing metrics'],
        ['Amendment of a signed visit is not implemented', 'A signed visit can be read but not corrected', 'Build the appended amendment before real records are entered'],
      ],
      [2600, 3400, 3600],
    ));

    // ------------------------------------------------------------------ 7
    b.push(L.h1(d, 'Handover'));
    p('The system was built during a student attachment that is ending. The following is recorded so that the work can be continued by another party.');
    const t71 = L.tableCaption(d, 'Position at Handover');
    b.push(t71.paragraph);
    b.push(L.table(
      ['Item', 'Position'],
      [
        ['Built and working', 'Sign in, roles, account administration, patient registry, clinic visits with section state and signing, laboratory requisitions with results and a printable form, and the consolidated patient record'],
        ['Specified and not built', 'Referrals, ergonomics, industrial hygiene, monthly returns and indicator computation'],
        ['Highest priority next step', 'Settle the decisions listed in the requirements specification, in particular referral authorisation and record retention'],
        ['Principal design risk', 'Erosion of the clinical access rule under management pressure. It is recorded with its reasoning so that any change is made deliberately and by an authorised party'],
        ['Principal delivery risk', 'No named owner after the attachment ends. This is a release blocker rather than a preference'],
        ['Where the truth lives', 'The supplied forms and the divisional dashboard are the primary sources. Everything else is derived from them or marked as a proposal'],
      ],
      [2400, 7200],
    ));

    b.push(L.spacer());
    const t72 = L.tableCaption(d, 'Architecture Document Sign Off');
    b.push(t72.paragraph);
    b.push(L.plainTable(
      ['Role', 'Name', 'Signature', 'Date'],
      [
        ['Prepared by, Software Engineering Intern', '', '', ''],
        ['Reviewed by, KMC ICT', '', '', ''],
        ['Approved by, Head of Department, Quality, Health, Safety and Environment', '', '', ''],
      ],
      [4200, 2000, 2200, 1400],
    ));

    return b;
  },
};
