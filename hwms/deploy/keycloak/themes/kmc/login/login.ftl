<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>

  <#if section = "header">
    <h1>Sign in</h1>
    <p>Use your Kiira Motors account.</p>

  <#elseif section = "form">
    <#if realm.password>
      <p class="kmc-card__lede">
        Your password is checked here by the corporate sign-in service. The Health and Wellness
        Dashboard never receives it.
      </p>

      <form id="kc-form-login" action="${url.loginAction}" method="post" novalidate>
        <div class="kmc-field">
          <label for="username">
            <#if !realm.loginWithEmailAllowed>${msg("username")}
            <#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}
            <#else>${msg("email")}
            </#if>
          </label>
          <input id="username"
                 name="username"
                 type="text"
                 value="${(login.username!'')}"
                 autocomplete="username"
                 autofocus
                 <#if usernameEditDisabled??>disabled</#if>
                 aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>">
        </div>

        <div class="kmc-field">
          <label for="password">${msg("password")}</label>
          <input id="password"
                 name="password"
                 type="password"
                 autocomplete="current-password"
                 aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>">

          <#--
            The field error is rendered beside the input rather than only at the
            top of the page. Keycloak deliberately returns one message for a
            wrong username and a wrong password alike, so that this page cannot
            be used to find out which accounts exist.
          -->
          <#if messagesPerField.existsError('username','password')>
            <span class="kmc-field__error" role="alert" aria-live="polite">
              ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
            </span>
          </#if>
        </div>

        <#if realm.rememberMe && !usernameEditDisabled??>
          <div class="kmc-checkbox">
            <input id="rememberMe" name="rememberMe" type="checkbox"
                   <#if login.rememberMe??>checked</#if>>
            <label for="rememberMe">${msg("rememberMe")}</label>
          </div>
        </#if>

        <#if realm.resetPasswordAllowed>
          <p class="kmc-field__hint">
            <a href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
          </p>
        </#if>

        <#-- Keycloak rejects a login POST without this. -->
        <input type="hidden" id="id-hidden-input" name="credentialId"
               <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>>

        <div class="kmc-actions">
          <button class="kmc-button kmc-button--primary" name="login" id="kc-login" type="submit">
            ${msg("doLogIn")}
          </button>
        </div>
      </form>
    </#if>

  <#elseif section = "socialProviders">
    <#--
      Rendered only when an identity provider is actually configured. Corporate
      single sign-on is a later configuration change rather than a release, and
      when it arrives it appears here without this theme being touched.
    -->
    <#if realm.password && social.providers?has_content>
      <div class="kmc-actions">
        <#list social.providers as p>
          <a class="kmc-button kmc-button--secondary" href="${p.loginUrl}" id="social-${p.alias}">
            ${p.displayName!}
          </a>
        </#list>
      </div>
    </#if>

  <#elseif section = "info">
    <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
      <p>${msg("noAccount")} <a href="${url.registrationUrl}">${msg("doRegister")}</a></p>
    </#if>
  </#if>

</@layout.registrationLayout>
