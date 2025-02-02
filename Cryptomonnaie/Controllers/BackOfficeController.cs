using Microsoft.AspNetCore.Mvc;

namespace Cryptomonnaie.Controllers
{
    public class BackOfficeController : Controller
    {
        private readonly ILogger<BackOfficeController> _logger;

        public BackOfficeController(ILogger<BackOfficeController> logger)
        {
            _logger = logger;
        }

        public IActionResult Login()
        {
            return File("~/Page/admin-login.html", "text/html");
        }

        public IActionResult Evolution()
        {
            return File("~/Page/admin-evolution.html", "text/html");
        }

        public IActionResult Cours()
        {
            return File("~/Page/admin-cours.html", "text/html");
        }

        public IActionResult Profile()
        {
            return File("~/Page/admin-profile.html", "text/html");
        }

        public IActionResult Portfolio()
        {
            return File("~/Page/admin-portfolio.html", "text/html");
        }

        public IActionResult Transactions()
        {
            return File("~/Page/admin-transactions.html", "text/html");
        }

        public IActionResult AnalyseTransactions()
        {
            return File("~/Page/admin-analyse-transactions.html", "text/html");
        }

        public IActionResult AnalysePortefeuilles()
        {
            return File("~/Page/admin-analyse-portefeuilles.html", "text/html");
        }

        public IActionResult AnalyseCommissions()
        {
            return File("~/Page/admin-analyse-commissions.html", "text/html");
        }

        public IActionResult Commissions()
        {
            return File("~/Page/admin-commissions.html", "text/html");
        }
    }
} 