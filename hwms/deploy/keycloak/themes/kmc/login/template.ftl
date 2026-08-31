<#--
  The page skeleton for every Keycloak screen this system shows.

  Written out in full rather than extended from the stock theme. Keycloak's own
  login markup has changed shape across recent versions, and a theme that
  overrides fragments of it inherits that churn: an upgrade restyles the sign-in
  page and nobody finds out until a user reports it. This file owns the whole
  page, so an upgrade can change Keycloak's default theme freely.

  The macro signature matches Keycloak's, so any template not overridden here -
  one-time password, email verification, consent, still renders inside this
  layout rather than falling back to an unbranded page.
-->
<#macro registrationLayout displayInfo=false displayMessage=true displayRequiredFields=false showTitle=true showAnotherWayIfPresent=true>
<!DOCTYPE html>
<html lang="<#if locale??>${locale.currentLanguageTag}<#else>en</#if>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <#-- A sign-in page has no business in a search index. -->
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("loginTitle",(realm.displayName!''))}</title>
  <#if properties.styles?has_content>
    <#list properties.styles?split(' ') as style>
      <link href="${url.resourcesPath}/${style}" rel="stylesheet">
    </#list>
  </#if>
</head>

<body>
<div class="kmc-page">

  <#--
    The branded panel. The same arrangement as the application's own sign-in
    page, so the handover to Keycloak and back does not read as leaving for a
    different system.
  -->
  <section class="kmc-brand">
    <div>
      <img class="kmc-brand__mark"
           src="${url.resourcesPath}/img/logo.png"
           alt="Kiira Motors Corporation">
      <span class="kmc-brand__eyebrow">Health and Wellness &middot; Occupational health</span>
    </div>

    <div>
      <span class="kmc-brand__department">
        Department of Quality, Health, Safety and Environment
      </span>
      <h2 class="kmc-brand__headline">Sign in to the workspace for your role</h2>
      <p class="kmc-brand__body">
        Operational records are captured once, where the work happens. Every figure reported to
        management is derived from those records and states where it came from.
      </p>
    </div>

    <div class="kmc-brand__notice">
      <div>
        <strong>Access follows the signed-in role</strong>
        <span>
          Individual clinical records &mdash; patients, visits, laboratory results and referrals
          &mdash; are open to the Health and Wellness Officer only. Every retrieval is logged.
        </span>
      </div>
    </div>
  </section>

  <#-- The form panel. -->
  <section class="kmc-panel">
    <div class="kmc-card">

      <#if showTitle>
        <div class="kmc-card__head">
          <#nested "header">
        </div>
      </#if>

      <#--
        Status is a word before it is a colour. Each message carries its own
        label so the meaning survives greyscale and a reader who cannot
        separate the brand red from the error red.
      -->
      <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <div class="kmc-message kmc-message--${message.type}" role="alert">
          <span class="kmc-message__label">
            <#if message.type = 'error'>Error
            <#elseif message.type = 'warning'>Warning
            <#elseif message.type = 'success'>Done
            <#else>Notice
            </#if>
          </span>
          <span>${kcSanitize(message.summary)?no_esc}</span>
        </div>
      </#if>

      <#nested "form">

      <#--
        Offered when an authentication flow has more than one route, a second
        factor, for instance. Rendered because the flow says so, not because
        this theme assumes one is configured.
      -->
      <#if auth?has_content && auth.showTryAnotherWayLink() && showAnotherWayIfPresent>
        <form action="${url.loginAction}" method="post" class="kmc-actions">
          <input type="hidden" name="tryAnotherWay" value="on">
          <button class="kmc-button kmc-button--secondary" type="submit">
            ${msg("doTryAnotherWay")}
          </button>
        </form>
      </#if>

      <#nested "socialProviders">

      <div class="kmc-card__foot">
        <#if displayRequiredFields>
          <p><span class="kmc-required">*</span> ${msg("requiredFields")}</p>
        </#if>
        <#if displayInfo>
          <#nested "info">
        </#if>
        <p>
          Accounts are created by the Health and Wellness manager. If you cannot sign in, or your
          account opens nothing, ask the manager rather than ICT &mdash; role assignment is theirs.
        </p>
      </div>

    </div>
  </section>

</div>
</body>
</html>
</#macro>
