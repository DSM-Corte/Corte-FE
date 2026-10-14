function AuthCard({ title, description, children }) {
  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-card__header">
        <h1 className="auth-card__title" id="auth-title">
          {title}
        </h1>
        {description && (
          <p className="auth-card__description">{description}</p>
        )}
      </div>

      {children}
    </section>
  );
}

export default AuthCard;
