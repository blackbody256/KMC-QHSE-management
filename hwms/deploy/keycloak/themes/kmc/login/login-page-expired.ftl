<#import "template.ftl" as layout>
<@layout.registrationLayout; section>

  <#--
    The sign-in attempt sat unfinished for longer than the flow allows. Common
    and harmless, a tab left open over lunch, so it is stated as a restart
    rather than as a failure.
  -->

  <#if section = "header">
    <h1>${msg("pageExpiredTitle")}</h1>
    <p>The sign-in attempt expired before it completed.</p>

  <#elseif section = "form">
    <p class="kmc-card__lede">
      This happens when the sign-in page is left open for a while. Start again, and nothing is lost.
    </p>

    <#--
      Keycloak's own wording for these two is "click here" twice over, which
      says nothing about which link does what. Named here instead.
    -->
    <div class="kmc-actions">
      <a class="kmc-button kmc-button--primary" id="loginRestartLink" href="${url.loginRestartFlowUrl}">
        Start signing in again
      </a>
      <a class="kmc-button kmc-button--secondary" id="loginContinueLink" href="${url.loginAction}">
        Continue where it stopped
      </a>
    </div>
  </#if>

</@layout.registrationLayout>
