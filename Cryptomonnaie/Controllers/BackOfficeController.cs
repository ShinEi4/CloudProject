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

        public IActionResult Dashboard()
        {
            return File("~/Page/admin-dashboard.html", "text/html");
        }

        public IActionResult Users()
        {
            return File("~/Page/admin-users.html", "text/html");
        }

        public IActionResult Settings()
        {
            return File("~/Page/admin-settings.html", "text/html");
        }
    }
} 