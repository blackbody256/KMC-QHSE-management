<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>

  <#--
    Reached when the flow itself has failed rather than the credentials, a
    misconfigured client, an expired action token, a redirect URI that does not
    match. It explains and offers the way back, rather than leaving a stock
    Keycloak error page as the last thing a user sees.
  -->

  <#if section = "header">
    <h1>${msg("errorTitle")}</h1>
    <p>Sign-in could not be completed.</p>

  <#elseif section = "form">
    <div class="kmc-message kmc-message--error" role="alert">
      <span class="kmc-message__label">Error</span>
      <span>${kcSanitize(message.summary)?no_esc}</span>
    </div>

    <p class="kmc-card__lede">
      Nothing is wrong with your password. If this recurs, tell ICT the time it happened.
    </p>

    <#if !skipLink?? && client?? && client.baseUrl?has_content>
      <div class="kmc-actions">
        <a class="kmc-button kmc-button--primary" id="backToApplication" href="${client.baseUrl}">
          ${kcSanitize(msg("backToApplication"))?no_esc}
        </a>
      </div>
    </#if>
  </#if>

</@layout.registrationLayout>
