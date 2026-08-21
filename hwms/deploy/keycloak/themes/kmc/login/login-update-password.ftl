<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('password','password-confirm'); section>

  <#--
    Every account created by the Health and Wellness manager is issued a
    temporary password, so this is the first page a new user sees after signing
    in for the first time. It is not an edge case, and it is styled as carefully
    as the sign-in page for that reason.
  -->

  <#if section = "header">
    <h1>Choose a new password</h1>
    <p>Your account was issued a temporary password. Replace it to continue.</p>

  <#elseif section = "form">
    <form id="kc-passwd-update-form" action="${url.loginAction}" method="post" novalidate>

      <#-- Present so a password manager can attach the new password to the
           right account. Hidden from the reader, who did not ask to change it. -->
      <input type="text" id="username" name="username" value="${username!''}"
             autocomplete="username" readonly="readonly" style="display:none;">
      <input type="password" id="password" name="password"
             autocomplete="current-password" style="display:none;">

      <div class="kmc-field">
        <label for="password-new">${msg("passwordNew")}</label>
        <input id="password-new" name="password-new" type="password"
               autocomplete="new-password" autofocus
               aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>">
        <#--
          The policy is stated before it is broken rather than only after. The
          realm enforces length(12), digits(1), notUsername and notEmail; these
          two must be changed together.
        -->
        <p class="kmc-field__hint">
          At least 12 characters, including one digit. It cannot contain your username or your
          email address.
        </p>
        <#if messagesPerField.existsError('password')>
          <span class="kmc-field__error" role="alert" aria-live="polite">
            ${kcSanitize(messagesPerField.get('password'))?no_esc}
          </span>
        </#if>
      </div>

      <div class="kmc-field">
        <label for="password-confirm">${msg("passwordConfirm")}</label>
        <input id="password-confirm" name="password-confirm" type="password"
               autocomplete="new-password"
               aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>">
        <#if messagesPerField.existsError('password-confirm')>
          <span class="kmc-field__error" role="alert" aria-live="polite">
            ${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}
          </span>
        </#if>
      </div>

      <#-- Keycloak's own control, kept because signing other sessions out after
           a password change is the safe default and the user should see it. -->
      <#if isAppInitiatedAction??>
        <div class="kmc-checkbox">
          <input type="checkbox" id="logout-sessions" name="logout-sessions" value="on" checked>
          <label for="logout-sessions">${msg("logoutOtherSessions")}</label>
        </div>
      </#if>

      <div class="kmc-actions">
        <button class="kmc-button kmc-button--primary" type="submit">
          ${msg("doSubmit")}
        </button>
        <#if isAppInitiatedAction??>
          <button class="kmc-button kmc-button--secondary" type="submit"
                  name="cancel-aia" value="true">
            ${msg("doCancel")}
          </button>
        </#if>
      </div>
    </form>
  </#if>

</@layout.registrationLayout>
