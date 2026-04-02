function Footer() {
  return (
    <>
      <footer className="sticky-footer bg-white mt-5 d-none d-md-block">
        <div className="container my-auto">
          <div className="copyright text-center my-auto">
            <span>&copy; PredictionCUP 2026</span>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button - also hidden on mobile */}
      <a className="scroll-to-top rounded d-none d-md-block" href="#page-top">
        <i className="fas fa-angle-up"></i>
      </a>
    </>
  );
}

export default Footer;
