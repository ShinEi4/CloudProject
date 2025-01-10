using System;
using System.ComponentModel.DataAnnotations;

public class CodePin
{
    public int Id_CodePin { get; set; }
    public string CodePinValue { get; set; }
    public DateTime DateCreation { get; set; }
    public bool Is_Valid { get; set; }
    public int Id_Utilisateur { get; set; }
}


