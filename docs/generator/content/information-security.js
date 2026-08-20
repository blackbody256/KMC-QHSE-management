module.exports = {
  slug: 'information-security',
  filename: 'Velo Information Security Review.docx',
  meta: {
    title: 'Information Security Review',
    reference: 'KMC.DPD.08/26-SP016',
    description: 'Security assessment of the Velo Electric Bus Fleet Operations Planning System covering identity, access control, data protection, audit and platform hardening',
    preparedBy: 'Charger Systems and Network Division',
    issueDate: '16/08/2026',
    version: '001',
    classification: 'Confidential, Restricted to KMC Security and E-Bus Xpress Management',
  },

  build(d, L) {
    const b = [];
    const p = (t) => b.push(L.para(t));
    const bl = (t) => b.push(L.bullet(t));

    // ---------------------------------------------------------------- 1
    b.push(L.h1(d, 'Introduction'));

    b.push(L.h2(d, 'Purpose'));
    p('This Information Security Review records the security posture of the Velo Electric Bus Fleet Operations Planning System as delivered, identifies the weaknesses that exist in that delivery, and sets out a remediation plan with owners and priorities. It is prepared in response to the request from E-Bus Xpress dated 11 August 2026.');
    p('The review is deliberately written to be usable as a working remediation plan rather than as a compliance statement. Every finding records what was observed, why it matters in operational terms, and what specific change closes it.');

    b.push(L.h2(d, 'Scope'));
    p('The review covers the application layer of the delivered Velo platform. That comprises the authentication and authorisation model implemented in the API gateway, the trust relationship between the gateway and the downstream services, the protection of data at rest and in transit, the audit trail, secret handling, container hardening, and the handling of driver personal data.');
    p('The review does not cover the physical security of the hosting site, the security of the corporate network into which Velo will be deployed, or the internal security of the Juza platform. Those remain the responsibility of their respective owners. The review also does not constitute a penetration test. It is a design and implementation review conducted against the delivered source, schema and configuration.');

    b.push(L.h2(d, 'Method'));
    p('The assessment was conducted by direct inspection of the delivered authentication and routing implementation, the database schema and role grants, the container build definitions, the service configuration, and the automated test suites that cover the security relevant paths. Findings were confirmed against the running system where a runtime observation was required.');

    b.push(L.h2(d, 'Severity Scale'));
    const t11 = L.tableCaption(d, 'Finding Severity Definitions');
    b.push(t11.paragraph);
    b.push(L.table(
      ['Severity', 'Definition', 'Required Response'],
      [
        ['Critical', 'Directly exposes credentials or operational data, or allows an unauthenticated party to act as an authorised user', 'Remediate before production traffic is admitted'],
        ['High', 'Materially increases the likelihood or impact of account compromise or undetected misuse', 'Remediate before production traffic is admitted, or operate an agreed compensating control'],
        ['Medium', 'Weakens defence in depth or reduces the ability to detect and investigate misuse', 'Remediate within the first release cycle after go live'],
        ['Low', 'Hardening opportunity with limited practical exposure in the deployed configuration', 'Remediate when the affected component is next changed'],
        ['Observation', 'No action strictly required. Recorded to inform future design', 'No deadline'],
      ],
      [1600, 5000, 3200],
    ));

    // ---------------------------------------------------------------- 2
    b.push(L.h1(d, 'Security Architecture'));

    b.push(L.h2(d, 'Trust Boundaries'));
    p('Velo has three trust boundaries. The first sits between the public network and the API gateway, and is crossed by operator browsers and driver devices presenting a bearer token. The second sits between the gateway and the downstream services, and is crossed only by requests carrying a shared internal secret. The third sits between each service and its own database, and is crossed using a dedicated least privilege role that can reach only that service schema.');
    b.push(...L.figure(d, 'trust-boundaries', 'Trust Boundaries and Their Controls'));
    b.push(L.richPara([
      'The arrangement in ',
      { ref: 'fig_2_1', cached: 'Figure 2.1' },
      ' is the reason a caller with network access to a domain service still cannot use it. Identity is established once, at the first boundary, and is proven rather than asserted at every boundary after it.',
    ]));
    const t21 = L.tableCaption(d, 'Trust Boundaries and Controlling Mechanisms');
    b.push(t21.paragraph);
    b.push(L.table(
      ['Boundary', 'Crossed By', 'Controlling Mechanism', 'Assessment'],
      [
        ['Public network to gateway', 'Operator browser, driver device', 'Signed bearer token validated on every request, role checked per route and method', 'Effective. See finding SEC-01 on transport protection'],
        ['Gateway to service', 'Proxied request', 'Client supplied identity headers deleted and reissued from the verified token, shared internal secret proving gateway origin', 'Effective and well implemented'],
        ['Service to database', 'Query', 'One database and one role per service with no cross schema grant', 'Effective'],
        ['Velo to Juza', 'Outbound request', 'Long lived interface key held in configuration', 'Weak. See finding SEC-08'],
        ['Velo to OSRM', 'Outbound request', 'Internal only, not exposed to the host network', 'Effective'],
      ],
      [2200, 1800, 3200, 2600],
    ));

    b.push(L.h2(d, 'Identity and Session Model'));
    p('Authentication is by username or employee number and password. Passwords are stored using an adaptive hash with a work factor of twelve, which is an appropriate standard and correctly implemented. On success the gateway issues a signed access token carrying the user identifier, role set and employee reference, together with a refresh token persisted in the gateway database.');
    p('Every request to a protected path is checked in two stages. The first stage validates the token signature and expiry and attaches the resulting claims to the request. The second stage compares the claims role set against the roles the route requires. A request with no valid token is refused before any handler runs, and a request with a valid token but an insufficient role is refused with a forbidden response.');

    b.push(L.h2(d, 'Authorisation Model'));
    p('Authorisation is enforced entirely at the gateway. Routes are registered individually by method and path, so a path that is readable by any authenticated user can still be writable only by an administrative role. Three roles hold the administrative surface, and the single irreversible action of permanently deleting a user account is restricted further to the highest role alone.');
    p('This design is sound and easy to audit because every authorisation decision is visible in one file. It carries one structural consequence that must be understood. A downstream service performs no authorisation of its own, so a route that is registered in the gateway under too permissive a role is not caught anywhere else. Route registration is therefore a security relevant change and must be reviewed as such.');

    // ---------------------------------------------------------------- 3
    b.push(L.h1(d, 'Findings'));
    p('Fourteen findings were raised. Two are assessed as critical, four as high, five as medium, two as low and one as an observation. Each finding is stated with its observation, its operational impact and the specific remediation that closes it.');

    b.push(L.h2(d, 'Critical Findings'));
    const t31 = L.tableCaption(d, 'Critical Findings');
    b.push(t31.paragraph);
    b.push(L.table(
      ['Reference', 'Finding', 'Impact', 'Remediation'],
      [
        ['SEC-01', 'Transport encryption is not terminated in front of the platform. The delivered deployment exposes the gateway and both front end applications over unencrypted transport', 'Passwords, bearer tokens and all operational data are transmitted in clear text and can be captured by any party able to observe the network path. A captured token is directly replayable', 'Terminate transport encryption at the ingress with a valid certificate, redirect all unencrypted requests, enable strict transport security response headers and monitor certificate expiry'],
        ['SEC-02', 'Multi factor authentication is not implemented anywhere in the platform. No second factor is required for administrative accounts or for privileged actions such as publishing a plan, overriding readiness or deleting a user', 'A single compromised password grants the full administrative surface, including permanent deletion of user accounts and publication of operational plans, with no second barrier', 'Implement time based one time password enrolment and verification for the administrative roles and for the privileged actions. Until implemented, operate the compensating controls in Section 4.2'],
      ],
      [1400, 3400, 2600, 2400],
    ));

    b.push(L.h2(d, 'High Findings'));
    const t32 = L.tableCaption(d, 'High Findings');
    b.push(t32.paragraph);
    b.push(L.table(
      ['Reference', 'Finding', 'Impact', 'Remediation'],
      [
        ['SEC-03', 'Brute force protection on the authentication endpoint is disabled by default in the delivered configuration', 'Password guessing against the login endpoint is unthrottled, which materially raises the chance of compromising a weak operator password', 'Enable the protection flag in the production environment, confirm by test that repeated failures are refused, and confirm that the counter store is reachable at start'],
        ['SEC-04', 'Refresh tokens are not rotated when used. A refresh token remains valid until it expires or is explicitly revoked, and the delivered default lifetime is thirty days', 'A refresh token captured from a device or a log remains usable for up to thirty days and its use is indistinguishable from the legitimate holder', 'Rotate the refresh token on every use and invalidate the previous value. Reduce the default lifetime. Confirm revocation on password change, role change and account disablement'],
        ['SEC-05', 'The access token lifetime is set to sixty minutes in the delivered configuration', 'A captured access token is usable for a full hour, and a role change or account disablement does not take effect until the token expires', 'Reduce the access token lifetime to the agreed policy value and rely on refresh for continuity'],
        ['SEC-06', 'The audit trail carries no tamper evidence. Update, delete and truncate are correctly revoked from the application role, but there is no hash chain or periodic signed digest', 'An account holding administrative database privilege could remove or alter audit records without detection, which removes non repudiation for exactly the events an investigation would rely on', 'Add a per record chain value or a periodic signed digest, and export the trail daily to storage that the application and database accounts cannot modify'],
      ],
      [1400, 3400, 2600, 2400],
    ));

    b.push(L.h2(d, 'Medium Findings'));
    const t33 = L.tableCaption(d, 'Medium Findings');
    b.push(t33.paragraph);
    b.push(L.table(
      ['Reference', 'Finding', 'Impact', 'Remediation'],
      [
        ['SEC-07', 'Rate limiting is applied only to the authentication endpoint. Other routed endpoints are unthrottled', 'An authenticated account can exhaust service capacity, and an expensive operation such as triggering plan generation can be invoked repeatedly', 'Apply a general per account and per address rate limit at the ingress or the gateway, with a stricter limit on plan generation'],
        ['SEC-08', 'Secrets are supplied through an environment file held alongside the deployment. No managed secret store is deployed and no rotation procedure exists', 'Secrets are readable by anyone with host access, are easily copied into an unintended location, and cannot be rotated without editing files and restarting services', 'Deploy a managed secret store, restrict host access to the platform owner, and define a rotation schedule for the signing secret, the internal secret, database passwords and the Juza key'],
        ['SEC-09', 'Database level overlap constraints are absent on the tables the planner writes. The exclusion constraint that exists applies to an earlier schema table the planner does not use', 'A direct database write or a future defect could create an overlapping charger allocation or an overlapping driver duty without being rejected, which is an operational safety issue rather than only a data quality issue', 'Add exclusion constraints on the live charging reservation and driver assignment tables, and restrict direct database access to the platform owner'],
        ['SEC-10', 'Driver personal data including name, licence number, telephone number and electronic mail address is stored without field level protection and is visible to every administrative role', 'The administrative surface is broader than the need to know for driver personal data, and there is no restriction distinguishing fleet administration from driver record access', 'Introduce a dedicated role for driver record access, restrict the administrative roles that can read personal fields, and confirm that access to those fields is recorded in the audit trail'],
        ['SEC-11', 'No dependency or container image vulnerability scanning is performed as part of the build', 'A known vulnerable dependency or base image can reach production without being detected', 'Add dependency and image scanning to the build and define a remediation window by severity'],
      ],
      [1400, 3400, 2600, 2400],
    ));

    b.push(L.h2(d, 'Low Findings and Observations'));
    const t34 = L.tableCaption(d, 'Low Findings and Observations');
    b.push(t34.paragraph);
    b.push(L.table(
      ['Reference', 'Severity', 'Finding', 'Remediation'],
      [
        ['SEC-12', 'Low', 'The application programming interface specification is served publicly without authentication at the documentation and specification paths', 'Accept if the interface shape is not treated as sensitive, otherwise place the documentation behind authentication'],
        ['SEC-13', 'Low', 'A development test harness page is served by the gateway in the delivered build', 'Disable the harness in production builds by configuration'],
        ['SEC-14', 'Observation', 'Only the first role in the claim set is forwarded to downstream services, although the model permits a user to hold several roles', 'No action required while downstream services perform no authorisation. Revisit if downstream authorisation is ever introduced'],
      ],
      [1400, 1400, 3600, 3400],
    ));

    b.push(L.h2(d, 'Controls Assessed as Effective'));
    p('The following controls were assessed and found to be correctly designed and correctly implemented. They are recorded so that future changes do not weaken them unknowingly.');
    const t35 = L.tableCaption(d, 'Controls Assessed as Effective');
    b.push(t35.paragraph);
    b.push(L.table(
      ['Control', 'Assessment'],
      [
        ['Password storage', 'An adaptive hash with a work factor of twelve. No password is stored or logged in recoverable form'],
        ['Identity header handling', 'Client supplied identity headers are deleted before the gateway sets its own from the verified token, so identity cannot be spoofed by a crafted header'],
        ['Gateway origin proof', 'Downstream services require a shared internal secret and compare it in constant time, so a caller with network access to a service cannot bypass the gateway'],
        ['Internal path exposure', 'Internal service paths are deliberately absent from the routing table and are therefore unreachable from outside, while remaining available to the gateway itself'],
        ['Secret strength enforcement', 'The gateway refuses to start if the signing secret or the internal secret is shorter than the required minimum length'],
        ['Container hardening', 'Services run from minimal images containing only the compiled binary, with no shell or package manager, and execute as a non root user'],
        ['Database privilege separation', 'Seven databases with seven roles. No service can read or write another service data'],
        ['Audit coverage', 'Every routed request produces an audit event carrying actor, action, result, source address and correlation identifier'],
        ['Failure isolation of audit', 'Audit publication failure is logged without affecting the response already returned, so audit unavailability cannot deny service'],
      ],
      [2600, 7000],
    ));

    // ---------------------------------------------------------------- 4
    b.push(L.h1(d, 'Remediation Plan'));

    b.push(L.h2(d, 'Sequenced Remediation'));
    p('Remediation is sequenced so that the changes which most reduce exposure are made first and so that no change depends on a component that is not yet deployed.');
    const t41 = L.tableCaption(d, 'Remediation Sequence');
    b.push(t41.paragraph);
    b.push(L.table(
      ['Stage', 'Findings Addressed', 'Actions', 'Owner'],
      [
        ['Before go live', 'SEC-01, SEC-03, SEC-05', 'Terminate transport encryption at the ingress. Enable brute force protection. Reduce the access token lifetime. Replace every default credential', 'Platform and Infrastructure'],
        ['Before go live', 'SEC-02', 'Agree and put into force the compensating controls in Section 4.2, since the second factor cannot be implemented within the release window', 'Security and Compliance'],
        ['First cycle after go live', 'SEC-04, SEC-06', 'Implement refresh token rotation. Add audit tamper evidence and daily export to protected storage', 'Product Development'],
        ['First cycle after go live', 'SEC-08, SEC-11', 'Deploy a managed secret store with a rotation schedule. Add dependency and image scanning to the build', 'Platform and Infrastructure'],
        ['Second cycle', 'SEC-02', 'Implement time based one time password enrolment and verification, and withdraw the compensating controls', 'Product Development'],
        ['Second cycle', 'SEC-07, SEC-09, SEC-10', 'Apply general rate limiting. Add database overlap constraints. Introduce a dedicated driver record role', 'Product Development'],
        ['When next changed', 'SEC-12, SEC-13', 'Place interface documentation behind authentication if required. Disable the test harness in production builds', 'Product Development'],
      ],
      [2000, 2000, 4000, 1800],
    ));

    b.push(L.h2(d, 'Compensating Controls for the Absence of a Second Factor'));
    p('The absence of multi factor authentication is the most significant finding that cannot be closed within the release window. The following controls are proposed as the compensating measure and must be operated for as long as the finding remains open. They are operational rather than technical and therefore depend on being followed.');
    bl('The administrative account list is reduced to the named minimum required to operate the pilot and is recorded in a register held by Operations');
    bl('Administrative accounts use a password of at least sixteen characters, generated rather than chosen, and issued individually with no shared accounts');
    bl('No administrative account is used for routine daily work. Operators hold a separate non administrative account for normal duties');
    bl('The audit trail of privileged actions is reviewed weekly by the Security and Compliance owner and the review is recorded');
    bl('An account is disabled on the same working day that the holder changes role or leaves');
    bl('Administrative access is available only from the operational network and not from public networks');

    b.push(L.h2(d, 'Verification of Remediation'));
    p('Each remediation must be verified before it is recorded as closed. Verification is by demonstration against the running system rather than by inspection of the change alone.');
    const t42 = L.tableCaption(d, 'Verification Method by Finding');
    b.push(t42.paragraph);
    b.push(L.table(
      ['Reference', 'Verification'],
      [
        ['SEC-01', 'An unencrypted request to the production hostname is refused or redirected, and the certificate expiry date is recorded in the monitoring register'],
        ['SEC-02', 'An administrative account without an enrolled second factor is refused, and a privileged action requires a valid code'],
        ['SEC-03', 'Repeated failed authentication attempts return the throttled response and the account is temporarily locked'],
        ['SEC-04', 'A refresh token presented a second time is refused after its first use'],
        ['SEC-05', 'A token presented after the configured lifetime is refused'],
        ['SEC-06', 'A record altered directly in the database is detected by the verification routine'],
        ['SEC-09', 'Two overlapping allocations inserted directly into the database are refused by the database itself'],
      ],
      [1600, 8000],
    ));

    // ---------------------------------------------------------------- 5
    b.push(L.h1(d, 'Data Protection'));

    b.push(L.h2(d, 'Personal Data Held'));
    p('Velo holds a limited set of personal data relating to drivers and system users. No payment data, no government identity document data and no biometric data is held or processed.');
    const t51 = L.tableCaption(d, 'Personal Data Inventory');
    b.push(t51.paragraph);
    b.push(L.table(
      ['Data', 'Subject', 'Purpose', 'Access'],
      [
        ['Full name', 'Driver', 'Roster and duty assignment', 'Administrative roles'],
        ['Employee number', 'Driver', 'Authentication and duty attribution', 'Administrative roles'],
        ['Licence number', 'Driver', 'Confirming eligibility to be assigned a duty', 'Administrative roles'],
        ['Telephone number and electronic mail address', 'Driver', 'Operational contact', 'Administrative roles'],
        ['Electronic mail address', 'System user', 'Authentication and audit attribution', 'Administrative roles'],
        ['Source network address', 'All users', 'Audit and investigation', 'Audit query interface'],
        ['Submitted vehicle condition observations', 'Driver', 'Readiness classification', 'Administrative roles'],
      ],
      [2600, 1400, 3200, 2400],
    ));

    b.push(L.h2(d, 'Retention and Erasure'));
    p('Retention periods are defined in the backup and recovery document and in the system requirements. The delivered system does not implement automatic purging, so retention is currently enforced by procedure rather than by the software. An erasure request must therefore be actioned manually by the platform owner, and the action is recorded in the audit trail.');
    p('Attention is drawn to one consequence of the audit design. Audit records are append only by design and cannot be deleted through the application. Where an erasure request affects audit records, the correct treatment is pseudonymisation of the personal fields in the operational tables while the audit record itself is retained, because the audit trail is required for operational accountability.');

    b.push(L.h2(d, 'Data Residency'));
    p('All operational data, personal data and audit records are held within the deployment. Velo makes outbound requests only to the Juza charger platform and to the internally hosted routing engine. No personal data is included in any outbound request. Reservation requests to Juza, where enabled, carry only vehicle and charger identifiers and time windows.');

    // ---------------------------------------------------------------- 6
    b.push(L.h1(d, 'Conclusion and Sign Off'));
    p('The Velo platform demonstrates a well constructed authorisation and service isolation design. The trusted subsystem pattern between the gateway and downstream services is correctly implemented, database privilege separation is genuine rather than nominal, and the container build produces a minimal attack surface. These are the parts of a security design that are difficult to retrofit, and they are present.');
    p('The weaknesses are concentrated in areas that are ordinarily supplied by the deployment platform rather than by the application. Transport encryption, secret management, vulnerability scanning and rate limiting are all platform responsibilities that have not yet been built because the target platform has not yet been built. The two application level weaknesses that matter most are the absence of a second authentication factor and the absence of tamper evidence on the audit trail.');
    p('The review concludes that Velo may proceed to a controlled production pilot provided that the before go live remediation in Section 4.1 is completed and evidenced, and that the compensating controls in Section 4.2 are formally adopted by Operations and operated for the duration of the pilot.');
    b.push(L.spacer());
    const t61 = L.tableCaption(d, 'Information Security Review Sign Off');
    b.push(t61.paragraph);
    b.push(L.plainTable(
      ['Role', 'Name', 'Signature', 'Date'],
      [
        ['Prepared by, Security and Compliance Owner', '', '', ''],
        ['Reviewed by, Platform and Infrastructure Owner', '', '', ''],
        ['Compensating controls accepted by, E-Bus Xpress Operations Manager', '', '', ''],
        ['Approved by, KMC Director Product Development', '', '', ''],
      ],
      [3800, 2200, 2400, 1400],
    ));

    return b;
  },
};
